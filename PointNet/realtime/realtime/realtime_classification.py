import argparse
import glob
from pathlib import Path
import shutil
import os
import numpy as np
import torch
import matplotlib; matplotlib.use('Agg')
import open3d as o3d
import open3d.visualization.gui as gui
import open3d.visualization.rendering as rendering
import threading
import time

from pcdet.config import cfg, cfg_from_yaml_file
from pcdet.datasets import DatasetTemplate
from pcdet.models import build_network, load_data_to_gpu
from pcdet.utils import common_utils

from AB3DMOT_libs.utils import Config, get_subfolder_seq, initialize
from AB3DMOT_libs.io import get_saving_dir, get_frame_det, save_results, save_affinity
from scripts.post_processing.combine_trk_cat import combine_trk_cat
from xinshuo_io import mkdir_if_missing, save_txt_file
from xinshuo_miscellaneous import get_timestring, print_log

from sensor_reader import OusterStreamReader  # 引入 sensor 讀取類別

from classification_api1 import create_classifier, classify

# 定義顏色映射
box_colormap = [
    [1, 1, 1],  # 白色
    [0, 1, 0],  # 綠色
    [0, 1, 1],  # 青色
    [1, 1, 0],  # 黃色
]

# DemoDataset 類
class DemoDataset(DatasetTemplate):
    def __init__(self, dataset_cfg, class_names, root_path: Path, ext='.bin', logger=None):
        super().__init__(dataset_cfg=dataset_cfg, class_names=class_names,
                         training=False, root_path=root_path, logger=logger)
        self.ext = ext
        files = sorted(glob.glob(str(root_path / f'*{ext}')))
        self.sample_file_list = [Path(p) for p in files]

    def __len__(self):
        return len(self.sample_file_list)

    def __getitem__(self, index):
        p = self.sample_file_list[index]
        if self.ext == '.bin':
            points = np.fromfile(p, dtype=np.float32).reshape(-1, 4)
        elif self.ext == '.npy':
            points = np.load(p)
        else:
            raise NotImplementedError(f"Unknown ext {self.ext}")

        input_dict = {'points': points, 'frame_id': index}
        data_dict = self.prepare_data(data_dict=input_dict)
        return data_dict

# 解析配置
def parse_config():
    parser = argparse.ArgumentParser(description='Real-time Detection, Tracking, and Visualization')
    parser.add_argument('--cfg_file', type=str, default='OpenPCDet/tools/cfgs/kitti_models/pointpillar.yaml', help='PointPillars 的 yaml config 路徑')
    parser.add_argument('--ckpt', type=str, default='OpenPCDet/tools/checkpoint_epoch_300.pth', help='PointPillars 的 checkpoint (.pth)')
    parser.add_argument('--data_path', type=str, default='data/KITTI/tracking/training/velodyne/0000', help='點雲 .bin 所在資料夾')
    parser.add_argument('--ext', type=str, default='.bin', help='點雲副檔名')
    parser.add_argument('--det_name', type=str, default='pointpillar', help='pointpillar, pointrcnn')
    parser.add_argument('--dataset', type=str, default='KITTI', help='KITTI, nuScenes')
    parser.add_argument('--split', type=str, default='val', help='train, val, test')
    parser.add_argument('--source', type=str, default='folder', choices=['folder', 'sensor'], help='資料來源: folder 或 sensor')
    parser.add_argument('--sensor_ip', type=str, default='192.168.50.144', help='Ouster sensor IP')
    args = parser.parse_args()
    cfg_from_yaml_file(args.cfg_file, cfg)
    return args, cfg

# 定義點雲變換函數
def transform_points(points):
    """
    對點雲進行旋轉和平移以符合訓練範圍
    :param points: (N, 3) numpy array
    :return: transformed points
    """
    # 步驟 1: 沿 Y 軸旋轉 90 度
    theta_y = np.pi / 2
    R_y = np.array([
        [np.cos(theta_y), 0, np.sin(theta_y)],
        [0, 1, 0],
        [-np.sin(theta_y), 0, np.cos(theta_y)]
    ])
    points = points @ R_y.T

    # 步驟 2: 沿 Z 軸旋轉 90 度
    theta_z = np.pi / 2
    R_z = np.array([
        [np.cos(theta_z), -np.sin(theta_z), 0],
        [np.sin(theta_z), np.cos(theta_z), 0],
        [0, 0, 1]
    ])
    points = points @ R_z.T

    # 步驟 3: 位移 (X 軸 +25, Z 軸 +3.5)
    translation = np.array([25, -1, 3.5])
    points += translation

    return points

def classify_boxes(points, boxes, classifier, car_type_map, use_gpu=False):
    """
    針對每個追蹤框進行點雲分類，並在 box 中新增 'label' 欄位。
    :param points: (N, 3) numpy array，全域點雲資料
    :param boxes: list of dict，每個包含 center, size, ry, id 等欄位
    :param classifier: 已載入的分類模型
    :param car_type_map: 類別索引對應名稱 dict
    :param use_gpu: 是否使用 GPU 推論
    :return: 更新後的 boxes，每個 box 多出 'label' 欄位
    """
    for box in boxes:
        # 建立 Open3D OrientedBoundingBox
        obb = o3d.geometry.OrientedBoundingBox()
        obb.center = box['center']
        obb.extent = box['size']
        obb.R = o3d.geometry.get_rotation_matrix_from_xyz([0, 0, box['ry']])

        # 轉換 points 為 Open3D 點雲物件
        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(points)

        # 擷取在框內的點
        inliers = obb.get_point_indices_within_bounding_box(pcd.points)
        if len(inliers) == 0:
            box['label'] = "unknown"
            continue
        cropped_points = np.asarray(pcd.points)[inliers]

        # 執行分類
        try:
            class_index = classify(classifier, cropped_points, use_gpu)
            #class_index, _ = classify(classifier, cropped_points, use_gpu)
            box['label'] = car_type_map[class_index]
        except Exception as e:
            print(f"[分類錯誤] ID {box['id']} 分類失敗: {e}")
            box['label'] = "error"
            
        # 顯示每個 box 的結果
        print(f"ID {box['id']} 點數: {len(cropped_points)}")
        print(f"類別: {box['label']}")
    
    return boxes

# 逐幀檢測與追蹤
def process_frame(model, dataset, tracker, frame_idx, logger, source='folder', sensor_reader=None, classifier=None, car_type_map=None, use_gpu=False):
    """逐幀執行檢測和追蹤"""
    if source == 'folder':
        data_dict = dataset[frame_idx]
        batch = dataset.collate_batch([data_dict])
        load_data_to_gpu(batch)
        points = data_dict['points'][:, :3]
    elif source == 'sensor':
        # 從 sensor 讀取資料
        scan_data = sensor_reader.read()
        points = scan_data['xyz']
        # 進行變換
        logger.info(f"進行變換----------------")
        points = transform_points(points)
        logger.info(f"進行變換----------------")
        # 構建 input_dict
        logger.info(f"構建 input_dict----------------")
        input_dict = {'points': np.hstack((points, scan_data['reflectivity'])), 'frame_id': frame_idx}
        data_dict = dataset.prepare_data(data_dict=input_dict)
        batch = dataset.collate_batch([data_dict])
        load_data_to_gpu(batch)
        logger.info(f"構建 input_dict----------------")
    else:
        raise ValueError("未知的資料來源類型")
        
    with torch.no_grad():
        logger.info(f"處理model.forward(batch)----------------")
        pred_dicts, _ = model.forward(batch)
        logger.info(f"處理model.forward(batch)__________________")

    # 提取檢測結果
    pred_boxes = pred_dicts[0]['pred_boxes'].cpu().numpy()    # (N,7): x,y,z,dx,dy,dz,heading
    pred_scores = pred_dicts[0]['pred_scores'].cpu().numpy()  # (N,)
    pred_labels = pred_dicts[0]['pred_labels'].cpu().numpy()  # (N,)

    # 格式化檢測結果為 AB3DMOT 所需的字典格式
    dets = []
    info = []
    for i in range(pred_boxes.shape[0]):
        x, y, z, dx, dy, dz, rot_y = pred_boxes[i]
        h, w, l = dz, dy, dx  # KITTI 格式 h,w,l
        score = pred_scores[i]
        label = pred_labels[i]  # 使用模型預測的 label
        dets.append([h, w, l, x, y, z, rot_y])
        info.append([score, label, 0.0])  # [score, label, other_info]

    dets = np.array(dets) if len(dets) > 0 else np.empty((0, 7), dtype=np.float32)
    info = np.array(info) if len(info) > 0 else np.empty((0, 3), dtype=np.float32)

    # 構建 AB3DMOT 所需的輸入字典
    dets_frame = {'dets': dets, 'info': info}
    logger.info(f"Frame {frame_idx}: dets shape={dets_frame['dets'].shape}, info shape={dets_frame['info'].shape}")

    # 執行追蹤
    results, affi = tracker.track(dets_frame, frame_idx, "0000")

    # 格式化追蹤結果為可視化格式
    boxes = []
    for result in results[0]:  # 假設使用第一個假設（hypo=0）
        h, w, l = result[0:3]
        x, y, z, ry = result[3:7]
        track_id = int(result[7])
        boxes.append({'center': [x, y, z], 'size': [l, w, h], 'ry': ry, 'id': track_id})

    # 框中點雲分類（分類後會在每個 box 中新增 'label'）
    boxes = classify_boxes(points, boxes, classifier, car_type_map, use_gpu)

    return points, boxes

# 可視化類
class VisualizerApp:
    def __init__(self, model, dataset, tracker, logger, source='folder', sensor_ip=None, classifier=None, car_type_map=None, use_gpu=False):
        self.app = gui.Application.instance
        self.app.initialize()
        self.window = self.app.create_window("AB3DMOT Real-time Viewer", 1280, 720)
        self.scene = gui.SceneWidget()
        self.scene.scene = rendering.Open3DScene(self.window.renderer)
        self.window.add_child(self.scene)
        self.model = model
        self.dataset = dataset
        self.tracker = tracker
        self.logger = logger
        self.frame_index = 0
        self.max_frames = len(dataset) if source == 'folder' else float('inf')
        self.scene.scene.set_background([0, 0, 0, 1])
        self.label_list = []
        self.running = True
        self.source = source
        self.classifier = classifier
        self.car_type_map = car_type_map
        self.use_gpu = use_gpu
        if source == 'sensor':
            self.sensor_reader = OusterStreamReader(sensor_ip)
        else:
            self.sensor_reader = None
        gui.Application.instance.post_to_main_thread(self.window, self.update_scene)

    def compute_eye_position(self, center, front, zoom, height_offset=2.0):
        center = np.array(center)
        front = np.array(front)
        front = front / np.linalg.norm(front)
        distance = 30.0 / zoom
        eye = center - distance * front
        eye[2] += height_offset
        return eye

    def update_scene(self):
        if (self.source == 'folder' and self.frame_index >= self.max_frames) or not self.running:
            self.logger.info("即時處理完成，關閉視窗")
            self.window.close()
            return

        self.logger.info(f"處理第 {self.frame_index:06d} 幀")

        # 逐幀檢測與追蹤
        points, boxes = process_frame(self.model, self.dataset, self.tracker, self.frame_index, self.logger, self.source, self.sensor_reader, self.classifier, self.car_type_map, self.use_gpu)

        # 更新點雲
        pcd = o3d.geometry.PointCloud()
        pcd.points = o3d.utility.Vector3dVector(points)
        self.scene.scene.clear_geometry()
        self.scene.scene.add_geometry("pointcloud", pcd, rendering.MaterialRecord())

        # 更新追蹤框
        for i, box in enumerate(boxes):
            obb = o3d.geometry.OrientedBoundingBox()
            obb.center = box['center']
            obb.extent = box['size']
            R = o3d.geometry.get_rotation_matrix_from_xyz([0, 0, box['ry']])
            obb.R = R
            mat = rendering.MaterialRecord()
            mat.shader = "defaultUnlit"
            color = box_colormap[box['id'] % len(box_colormap)]
            mat.base_color = [*color, 0.6]
            self.scene.scene.add_geometry(f"box_{i}", obb, mat)

            # 添加 ID 標籤
            text_pos = [box['center'][0], box['center'][1], box['center'][2] + box['size'][2] / 2 + 0.5]
            label_text = f"ID {box['id']}"
            if 'label' in box and box['label'] not in ['unknown', 'error']:
                label_text += f" - {box['label']}"
            label = self.scene.add_3d_label(text_pos, label_text)
            label.color = gui.Color(1, 1, 0)
            self.label_list.append(label)

        # 添加坐標軸
        axis_pcd = o3d.geometry.TriangleMesh.create_coordinate_frame(size=1.0, origin=[0, 0, 0])
        self.scene.scene.add_geometry("axis", axis_pcd, rendering.MaterialRecord())

        # 添加視覺化範圍框
        min_bound = [0, -8.96, -3]
        max_bound = [69.12, 8.96, 1]
        bbox = o3d.geometry.AxisAlignedBoundingBox(min_bound, max_bound)
        bbox_lines = o3d.geometry.LineSet.create_from_axis_aligned_bounding_box(bbox)
        bbox_lines.paint_uniform_color([1, 0, 0])
        mat_bbox = rendering.MaterialRecord()
        mat_bbox.shader = "defaultUnlit"
        self.scene.scene.add_geometry("bbox", bbox_lines, mat_bbox)

        # 設定攝影機
        ctr = self.scene.scene.camera
        center = [30, 0, 1]
        front = [0, -1, 0]
        zoom = 1.0
        height_offset = 30.0
        eye = self.compute_eye_position(center, front, zoom, height_offset)
        ctr.look_at(center, eye, [0, 0, 1])

        # 清除上一幀的標籤
        def remove_label():
            for label in self.label_list:
                self.scene.remove_3d_label(label)
            self.label_list.clear()

        def remove_all_labels():
            time.sleep(0.1)
            gui.Application.instance.post_to_main_thread(self.window, remove_label)

        threading.Thread(target=remove_all_labels).start()

        # 更新下一幀
        self.frame_index += 1
        def next_frame():
            time.sleep(0.1)  # 控制顯示速度
            gui.Application.instance.post_to_main_thread(self.window, self.update_scene)
        threading.Thread(target=next_frame).start()

    def run(self):
        self.app.run()

# 主函數
def main():
    args, cfg = parse_config()

    # 初始化日誌
    logger = common_utils.create_logger()
    logger.info('------------- 即時檢測、追蹤與可視化 -------------')

    if args.source == 'folder':
        # 初始化數據集
        dataset = DemoDataset(
            dataset_cfg=cfg.DATA_CONFIG,
            class_names=cfg.CLASS_NAMES,
            root_path=Path(args.data_path),
            ext=args.ext,
            logger=logger
        )
        logger.info(f'總共 {len(dataset)} 幀要處理')
    elif args.source == 'sensor':
        # sensor 模式下，dataset 僅用於 prepare_data
        dataset = DatasetTemplate(
            dataset_cfg=cfg.DATA_CONFIG,
            class_names=cfg.CLASS_NAMES,
            training=False,
            root_path=None,
            logger=logger
        )
        logger.info('從 sensor 即時讀取資料')
    else:
        raise ValueError("未知的資料來源類型")

    # 初始化模型
    model = build_network(model_cfg=cfg.MODEL,
                          num_class=len(cfg.CLASS_NAMES),
                          dataset=dataset)
    model.load_params_from_file(filename=args.ckpt, logger=logger, to_cpu=True)
    model.cuda().eval()

    # 初始化 AB3DMOT 追蹤器
    config_path = './configs/%s.yml' % args.dataset
    ab3dmot_cfg, _ = Config(config_path)
    if args.split: ab3dmot_cfg.split = args.split
    if args.det_name: ab3dmot_cfg.det_name = args.det_name

    subfolder, det_id2str, hw, seq_eval, data_root = get_subfolder_seq(ab3dmot_cfg.dataset, ab3dmot_cfg.split)
    trk_root = os.path.join(data_root, 'tracking')
    tracker, frame_list = initialize(ab3dmot_cfg, trk_root, ab3dmot_cfg.save_root, subfolder, "0000", ab3dmot_cfg.cat_list[0], 1, hw, logger)

    # 初始化分類模型
    #model_path = 'Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    model_path = '/opt/yzu/Huang/AB3DMOT/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    use_gpu = False
    classifier, car_type = create_classifier(model_path, use_gpu)

    # 啟動即時可視化
    visualizer = VisualizerApp(model, dataset, tracker, logger, args.source, args.sensor_ip, classifier=classifier, car_type_map=car_type, use_gpu=use_gpu)
    visualizer.run()


if __name__ == '__main__':
    main()
