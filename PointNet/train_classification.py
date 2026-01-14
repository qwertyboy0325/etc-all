"""
Author: Benny
Date: Nov 2019
"""

import os
import sys
import torch
import numpy as np

import datetime
import logging
import provider
import importlib
import shutil
import argparse

import time #Add by Teng

from pathlib import Path
from tqdm import tqdm
from data_utils.ModelNetDataLoader import ModelNetDataLoader
from data_utils.FETCdataLoader import FETCdataLoader

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = BASE_DIR
sys.path.append(os.path.join(ROOT_DIR, 'models'))

def parse_args():
    '''PARAMETERS'''
    parser = argparse.ArgumentParser('training')
    parser.add_argument('--use_cpu', action='store_true', default=False, help='use cpu mode')
    parser.add_argument('--gpu', type=str, default='0', help='specify gpu device')
    parser.add_argument('--batch_size', type=int, default=24, help='batch size in training')
    parser.add_argument('--model', default='pointnet_cls', help='model name [default: pointnet_cls]')
    # parser.add_argument('--num_category', default=40, type=int, choices=[10, 40],  help='training on ModelNet10/40') # Marked by Teng
    parser.add_argument('--epoch', default=200, type=int, help='number of epoch in training')
    parser.add_argument('--learning_rate', default=0.001, type=float, help='learning rate in training')
    parser.add_argument('--num_point', type=int, default=1024, help='Point Number')
    parser.add_argument('--optimizer', type=str, default='Adam', help='optimizer for training')
    parser.add_argument('--log_dir', type=str, default=None, help='experiment root')
    parser.add_argument('--clear_log', action='store_true', default=False, help='clear log data, including pretrained model') # Added by Teng
    parser.add_argument('--data_dir', type=str, default=None, help='the directory of point cloud data') # Added by Teng
    parser.add_argument('--decay_rate', type=float, default=1e-4, help='decay rate')
    parser.add_argument('--use_normals', action='store_true', default=False, help='use normals')
    parser.add_argument('--process_data', action='store_true', default=False, help='save data offline')
    parser.add_argument('--sampler', default='uniform', help='Sampling approach: farthest sampling, random sampling, or uniform sampling') # Modified by Teng
    return parser.parse_args()


def inplace_relu(m):
    classname = m.__class__.__name__
    if classname.find('ReLU') != -1:
        m.inplace=True


def test(model, loader, use_gpu, num_class=40): # Modified by Teng
    # start_time = time.perf_counter() #Add by Teng
    mean_correct = []
    class_acc = np.zeros((num_class, 3))
    classifier = model.eval()

    for j, (points, target) in tqdm(enumerate(loader), total=len(loader)):

        # t1 = time.perf_counter() #Add by Teng
        if use_gpu: # Modified by Teng
            points, target = points.cuda(), target.cuda()

        # t2 = time.perf_counter() #Add by Teng

        points = points.transpose(2, 1)
        pred, _ = classifier(points)
        pred_choice = pred.data.max(1)[1]

        # t3 = time.perf_counter() #Add by Teng

        for cat in np.unique(target.cpu()):
            classacc = pred_choice[target == cat].eq(target[target == cat].long().data).cpu().sum()
            class_acc[cat, 0] += classacc.item() / float(points[target == cat].size()[0])
            class_acc[cat, 1] += 1

        # t4 = time.perf_counter() #Add by Teng

        correct = pred_choice.eq(target.long().data).cpu().sum()
        mean_correct.append(correct.item() / float(points.size()[0]))

        # t5 = time.perf_counter() #Add by Teng

        # Add by Teng
        # execution_time1 = t2 - t1
        # execution_time2 = t3 - t2
        # execution_time3 = t4 - t3
        # execution_time4 = t5 - t4
        # print(f"{j}執行時間: To GPU {execution_time1:.6f} 秒")
        # print(f"{j}執行時間: Classify {execution_time2:.6f} 秒")
        # print(f"{j}執行時間: Class acc {execution_time3:.6f} 秒")
        # print(f"{j}執行時間: Mean acc {execution_time4:.6f} 秒")


    class_acc[:, 2] = class_acc[:, 0] / class_acc[:, 1]
    class_acc = np.mean(class_acc[:, 2])
    instance_acc = np.mean(mean_correct)

    # Add by Teng
    # end_time = time.perf_counter()
    # execution_time = end_time - start_time
    # print(f"執行時間: {execution_time:.6f} 秒")

    return instance_acc, class_acc


def main(args):
    def log_string(str):
        logger.info(str)
        print(str)

    '''HYPER PARAMETER'''
    os.environ["CUDA_VISIBLE_DEVICES"] = args.gpu

    '''CREATE DIR'''
    timestr = str(datetime.datetime.now().strftime('%Y-%m-%d_%H-%M'))
    exp_dir = Path('./log/')
    exp_dir.mkdir(exist_ok=True)
    exp_dir = exp_dir.joinpath('classification')
    exp_dir.mkdir(exist_ok=True)
    if args.log_dir is None:
        exp_dir = exp_dir.joinpath(timestr)
    else:
        exp_dir = exp_dir.joinpath(args.log_dir)

    if os.path.exists(exp_dir) and args.clear_log: # Added by Teng
        shutil.rmtree(exp_dir, ignore_errors=True)  # Added by Teng

    exp_dir.mkdir(exist_ok=True)
    checkpoints_dir = exp_dir.joinpath('checkpoints/')
    checkpoints_dir.mkdir(exist_ok=True)
    log_dir = exp_dir.joinpath('logs/')
    log_dir.mkdir(exist_ok=True)



    '''LOG'''
    args = parse_args() # Marked by Teng
    logger = logging.getLogger("Model")
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler('%s/%s.txt' % (log_dir, args.model))
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    log_string('PARAMETER ...')
    log_string(args)

    '''DATA LOADING'''
    log_string('Load dataset ...')
    data_path = args.data_dir

    # Add by Teng
    train_dataset = FETCdataLoader(root=data_path, args=args, split='train', process_data=args.process_data)
    test_dataset = FETCdataLoader(root=data_path, args=args, split='test', process_data=args.process_data)

    trainDataLoader = torch.utils.data.DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=10, drop_last=True)
    testDataLoader = torch.utils.data.DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=10)

    '''MODEL LOADING'''
    # num_class = args.num_category # Marked by Teng
    num_class = train_dataset.num_category # Add by Teng
    model = importlib.import_module(args.model)
    shutil.copy('./models/%s.py' % args.model, str(exp_dir))
    shutil.copy('models/pointnet2_utils.py', str(exp_dir))
    shutil.copy('./train_classification.py', str(exp_dir))

    classifier = model.get_model(num_class, normal_channel=args.use_normals)
    criterion = model.get_loss()
    classifier.apply(inplace_relu)

    if not args.use_cpu:
        classifier = classifier.cuda()
        criterion = criterion.cuda()

    try:
        checkpoint = torch.load(str(exp_dir) + '/checkpoints/best_model.pth', weights_only=False)
        start_epoch = checkpoint['epoch']
        classifier.load_state_dict(checkpoint['model_state_dict'])
        log_string('Use pretrain model')

        # Added by Teng
        print('start_epoch: ', start_epoch)
        with torch.no_grad():
            start_time = time.perf_counter()
            best_instance_acc, best_class_acc = test(classifier.eval(), testDataLoader, not args.use_cpu, num_class=num_class) # Modified by Teng
            end_time = time.perf_counter()
            execution_time = end_time - start_time
            print(f"Test set time: {execution_time:.6f} 秒")
            print(f"Average time for each : {execution_time/len(test_dataset):.6f} 秒")
            print('Best Instance Accuracy: %f, Class Accuracy: %f' % (best_instance_acc, best_class_acc))

    except:
        log_string('No existing model, starting training from scratch...')
        start_epoch = 0
        # Added by Teng
        best_instance_acc = 0
        best_class_acc = 0

    if args.optimizer == 'Adam':
        optimizer = torch.optim.Adam(
            classifier.parameters(),
            lr=args.learning_rate,
            betas=(0.9, 0.999),
            eps=1e-08,
            weight_decay=args.decay_rate
        )
    else:
        optimizer = torch.optim.SGD(classifier.parameters(), lr=0.01, momentum=0.9)

    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=20, gamma=0.7)
    global_epoch = 0
    global_step = 0
    # best_instance_acc = 0.0 # Marked by Teng
    # best_class_acc = 0.0 # Marked by Teng

    '''TRANING'''
    logger.info('Start training...')
    for epoch in range(start_epoch, args.epoch):
        log_string('Epoch %d (%d/%s):' % (global_epoch + 1, epoch + 1, args.epoch))
        start_time = time.perf_counter() # Add by Teng
        mean_correct = []
        classifier = classifier.train()

        scheduler.step()
        for batch_id, (points, target) in tqdm(enumerate(trainDataLoader, 0), total=len(trainDataLoader), smoothing=0.9):
            optimizer.zero_grad()

            points = points.data.numpy()
            points = provider.random_point_dropout(points)
            points[:, :, 0:3] = provider.random_scale_point_cloud(points[:, :, 0:3]) # Teng's comments: I think that this scale is unnecessary for our application. However, with this scaling the training may produce higher accuracy.
            points[:, :, 0:3] = provider.shift_point_cloud(points[:, :, 0:3])
            points = torch.Tensor(points)
            points = points.transpose(2, 1)

            if not args.use_cpu:
                points, target = points.cuda(), target.cuda()

            pred, trans_feat = classifier(points)
            loss = criterion(pred, target.long(), trans_feat)
            pred_choice = pred.data.max(1)[1]

            correct = pred_choice.eq(target.long().data).cpu().sum()
            mean_correct.append(correct.item() / float(points.size()[0]))
            loss.backward()
            optimizer.step()
            global_step += 1

        train_instance_acc = np.mean(mean_correct)
        log_string('Train Instance Accuracy: %f' % train_instance_acc)

        # Add by Teng
        end_time = time.perf_counter()
        execution_time = end_time - start_time
        print(f"Training time for an epoch: {execution_time:.6f} 秒")

        with torch.no_grad():
            instance_acc, class_acc = test(classifier.eval(), testDataLoader, not args.use_cpu,  num_class=num_class) # Modified by Teng

            if (instance_acc >= best_instance_acc):
                best_instance_acc = instance_acc
                best_epoch = epoch + 1

            if (class_acc >= best_class_acc):
                best_class_acc = class_acc
            log_string('Test Instance Accuracy: %f, Class Accuracy: %f' % (instance_acc, class_acc))
            log_string('Best Instance Accuracy: %f, Class Accuracy: %f' % (best_instance_acc, best_class_acc))

            if (instance_acc >= best_instance_acc):
                logger.info('Save model...')
                savepath = str(checkpoints_dir) + '/best_model.pth'
                log_string('Saving at %s' % savepath)
                state = {
                    'epoch': best_epoch,
                    'instance_acc': instance_acc,
                    'class_acc': class_acc,
                    'model_state_dict': classifier.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'classes': train_dataset.classes,
                }
                torch.save(state, savepath)
            global_epoch += 1

    logger.info('End of training...')

def training_function(data_dir, log_dir,  epoch, gpu_device, process_data, clear_log):
    original_argv = sys.argv.copy()
    sys.argv.clear()
    sys.argv.append(original_argv[0])
    sys.argv.append('--data_dir')
    sys.argv.append(data_dir)
    sys.argv.append('--log_dir')
    sys.argv.append(log_dir)
    sys.argv.append('--epoch')
    sys.argv.append(epoch)
    sys.argv.append('--gpu')
    sys.argv.append(gpu_device)
    if process_data:
        sys.argv.append('--process_data')
    if clear_log:
        sys.argv.append('--clear_log')
    args = parse_args()

    main(args)
    sys.argv = original_argv.copy()

if __name__ == '__main__':
    args = parse_args()
    main(args)

    # Teng say: My arguments for training ModelNet40
    # --model pointnet_cls --log_dir pointnet_cls --gpu 0 --epoch 200 --process_data --sampler uniform
    # --model pointnet_cls --data_dir E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/ --log_dir pointnet_cls_fetc_noise_std_0.05 --gpu 0 --epoch 200 --process_data --sampler uniform

    # Teng say: My arguments for training FETC dataset
    # --model pointnet_cls --log_dir pointnet_cls_fetc --gpu 0 --epoch 50 --process_data --sampler uniform --data_dir E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/
