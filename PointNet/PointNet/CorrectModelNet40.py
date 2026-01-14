import glob
import os

#data_dir = "D:/Programming/python/Pointnet_Pointnet2_pytorch-master/data/modelnet40_normal_resampled/ModelNet40/bathtub"

#data_dir = "E:/ModelNet40/bathtub"
#data_dir = "E:/ModelNet40/desk"
#data_dir = "E:/ModelNet40/dresser"
#data_dir = "E:/ModelNet40/monitor"
data_dir = "E:/ModelNet40/night_stand"

target_folders = {'train', 'test'}

for folder in target_folders:
    search_path = os.path.join(data_dir, '**', folder, '*.*')  # 搜索所有類型的文件
    for file_path in glob.glob(search_path, recursive=True):
        with open(file_path, 'r') as file:
            lines = file.readlines()
            first_line = lines[0].rstrip()
        if len(first_line) > 3:
            modified_lines = ['OFF\n']
            modified_lines.append(first_line[3:]+'\n')
            modified_lines += lines[1:]
            with open(file_path, 'w') as file:
                file.writelines(modified_lines)
