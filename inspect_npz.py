import numpy as np
import sys
import os

path = "training-data/raw_data/sample_dataset/semitrailer_truck_000774.npz"
if not os.path.exists(path):
    print(f"File not found: {path}")
    sys.exit(1)

try:
    data = np.load(path)
    print(f"Keys: {list(data.keys())}")
    for k in data.keys():
        arr = data[k]
        print(f"Key: {k}, Shape: {arr.shape}, Dtype: {arr.dtype}, Ndim: {arr.ndim}")
except Exception as e:
    print(f"Error: {e}")








