"""
Integration script for PointNet training.
This script acts as a bridge between the annotation system and the training system.
"""

import sys
import os
import argparse
from pathlib import Path

# Add PointNet to Python path
BASE_DIR = Path(__file__).parent.parent
POINTNET_DIR = BASE_DIR / "PointNet"
sys.path.insert(0, str(POINTNET_DIR))

# Import the original training script
from train_classification import main as train_main, parse_args


def main():
    parser = argparse.ArgumentParser(description='Train PointNet model')
    parser.add_argument('--data_dir', type=str, required=True, help='Path to exported dataset')
    parser.add_argument('--model', type=str, default='pointnet_cls', help='Model name')
    parser.add_argument('--epoch', type=int, default=200, help='Number of epochs')
    parser.add_argument('--gpu', type=str, default='0', help='GPU device')
    parser.add_argument('--batch_size', type=int, default=24, help='Batch size')
    parser.add_argument('--num_point', type=int, default=1024, help='Number of points')
    parser.add_argument('--sampler', type=str, default='uniform', help='Sampling method: uniform, farthest, random')
    parser.add_argument('--process_data', action='store_true', help='Process data offline')
    parser.add_argument('--clear_log', action='store_true', help='Clear previous logs')
    parser.add_argument('--log_dir', type=str, default='pointnet_cls_fetc', help='Log directory name')
    
    args = parser.parse_args()
    
    # Prepare arguments for the original training script
    sys.argv = [
        'train_classification.py',
        '--data_dir', args.data_dir,
        '--model', args.model,
        '--epoch', str(args.epoch),
        '--gpu', args.gpu,
        '--batch_size', str(args.batch_size),
        '--num_point', str(args.num_point),
        '--sampler', args.sampler,
        '--log_dir', args.log_dir,
    ]
    
    if args.process_data:
        sys.argv.append('--process_data')
    
    if args.clear_log:
        sys.argv.append('--clear_log')
    
    # Change working directory to PointNet
    os.chdir(POINTNET_DIR)
    
    # Run the training
    print(f"Starting PointNet training...")
    print(f"Data directory: {args.data_dir}")
    print(f"Model: {args.model}")
    print(f"Epochs: {args.epoch}")
    print(f"GPU: {args.gpu}")
    print(f"Sampler: {args.sampler}")
    
    # Call the original main function
    train_args = parse_args()
    train_main(train_args)


if __name__ == '__main__':
    main()
