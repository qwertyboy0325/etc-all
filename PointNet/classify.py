import numpy as np
import glob
import os
from classification_api import create_classifier, classify
import time

def classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_name):
    num_incorrect = 0
    npz_files = glob.glob(os.path.join(data_folder, "*.npz"))
    total = len(npz_files)
    if total==0:
        return 0, 0.0, 0
    for file in npz_files:
        try:
            data = np.load(file)
            points = data['pts']
            car_index, probs = classify(classifier, points, use_gpu=use_gpu)
            if car_type[car_index] != car_name:
                num_incorrect = num_incorrect+1
        except Exception as e:
            error_line = f"{file}\tError: {str(e)}"
            print(error_line)
    return total-num_incorrect, (total-num_incorrect)/total, total

def evaluation_on_augmented_data_no_noise():
    use_gpu = True
    print("Noise Std: 0.00")
    model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_no_noise/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)

    total_correct = 0
    total_samples = 0
    car_type_name = 'car'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoNoise/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'delivery_vehicle'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoNoise/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'semitrailer_truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoNoise/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoNoise/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'bus'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoNoise/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    print("Average accuracy:", total_correct/total_samples *100)

def evaluation_on_augmented_data_noise_std_005():
    use_gpu = True
    print("Noise Std: 0.05")
    model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)

    total_correct = 0
    total_samples = 0
    car_type_name = 'car'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'delivery_vehicle'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100 * accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'semitrailer_truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100 * accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100 * accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'bus'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100 * accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    print("Average accuracy:", total_correct/total_samples *100)

def evaluation_on_all_data():
    use_gpu = True
    model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)

    total_correct = 0
    total_samples = 0
    car_type_name = 'car'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'delivery_vehicle'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'semitrailer_truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'bus'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    print(f"Average accuracy: {total_correct}/{total_samples} = {total_correct/total_samples *100}")


def evaluation_on_test_data():
    use_gpu = True
    model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)

    total_correct = 0
    total_samples = 0
    car_type_name = 'car'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'delivery_vehicle'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'semitrailer_truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'bus'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/{car_type_name}/test/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}:', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    print(f"Average accuracy: {total_correct}/{total_samples} = {total_correct/total_samples *100}")

def evaluation_on_FETC_test_data():
    use_gpu = True
    # model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_no_noise/checkpoints/best_model.pth'
    model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)

    total_correct = 0
    total_samples = 0
    car_type_name = 'car'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/Combined/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'delivery_vehicle'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/Combined/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'semitrailer_truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/Combined/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/Combined/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'bus'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/Combined/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    print(f"Average accuracy: {total_correct}/{total_samples} = {total_correct/total_samples *100}")

def evaluation_on_FETC_test_data_by_time_period():
    use_gpu = True
    # model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_no_noise/checkpoints/best_model.pth'
    model_path = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)

    total_correct = 0
    total_samples = 0
    car_type_name = 'car'
    # time_period = '20251101_2000_2100'
    time_period = '20251101_2000_2100_9000'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/{time_period}/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    if num_samples >0:
        print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    car_type_name = 'delivery_vehicle'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/{time_period}/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    if num_samples >0:
        print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'semitrailer_truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/{time_period}/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    if num_samples >0:
        print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'truck'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/{time_period}/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    if num_samples >0:
        print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples


    car_type_name = 'bus'
    data_folder = f"E:/DataSets/FETC_Point_Cloud_Data/遠通驗證資料/TestData/Labeled/{time_period}/{car_type_name}/train/"
    t1 = time.perf_counter()
    num_correct, accuracy, num_samples = classify_data_in_a_folder(classifier, use_gpu, data_folder, car_type, car_type_name)
    t2 = time.perf_counter()
    print(f'{car_type_name}: {num_correct}/{num_samples}', num_correct, 100*accuracy)
    if num_samples >0:
        print(f"Classification time/sample: {(t2 - t1) / num_samples * 1000:.6f} ms")
    total_correct += num_correct
    total_samples += num_samples

    print(f"Average accuracy: {total_correct}/{total_samples} = {total_correct/total_samples *100}")

if __name__ == '__main__':
     # evaluation_on_augmented_data_no_noise()
     # evaluation_on_augmented_data_noise_std_005()
     # evaluation_on_all_data()
     # evaluation_on_test_data()
     # evaluation_on_FETC_test_data()
     evaluation_on_FETC_test_data_by_time_period()
