#!/usr/bin/env python3
"""
NPZ 文件分析工具
用於分析 NumPy 壓縮文件 (.npz) 的內容和結構
"""

import numpy as np
import os
import json
from pathlib import Path
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import pandas as pd


class NPZAnalyzer:
    """NPZ 文件分析器"""
    
    def __init__(self, npz_file_path):
        """
        初始化分析器
        
        Args:
            npz_file_path (str): NPZ 文件路徑
        """
        self.npz_file_path = Path(npz_file_path)
        self.data = None
        self.analysis_result = {}
        
    def load_file(self):
        """載入 NPZ 文件"""
        try:
            self.data = np.load(self.npz_file_path)
            print(f"✅ 成功載入文件: {self.npz_file_path}")
            return True
        except Exception as e:
            print(f"❌ 載入文件失敗: {e}")
            return False
    
    def analyze_structure(self):
        """分析文件結構"""
        if self.data is None:
            return None
            
        structure = {
            "file_name": self.npz_file_path.name,
            "file_size_mb": self.npz_file_path.stat().st_size / (1024 * 1024),
            "arrays": {}
        }
        
        for key in self.data.files:
            array = self.data[key]
            structure["arrays"][key] = {
                "shape": array.shape,
                "dtype": str(array.dtype),
                "size": array.size,
                "memory_usage_mb": array.nbytes / (1024 * 1024),
                "min_value": float(np.min(array)) if array.size > 0 else None,
                "max_value": float(np.max(array)) if array.size > 0 else None,
                "mean_value": float(np.mean(array)) if array.size > 0 else None,
                "std_value": float(np.std(array)) if array.size > 0 else None
            }
        
        self.analysis_result["structure"] = structure
        return structure
    
    def analyze_point_cloud(self):
        """分析點雲數據（如果存在）"""
        if self.data is None:
            return None
            
        point_cloud_analysis = {}
        
        # 尋找可能的點雲數據
        possible_point_keys = ['points', 'xyz', 'coordinates', 'vertices', 'data']
        
        for key in self.data.files:
            array = self.data[key]
            if len(array.shape) == 2 and array.shape[1] >= 3:
                # 可能是點雲數據
                point_cloud_analysis[key] = {
                    "is_point_cloud": True,
                    "num_points": array.shape[0],
                    "dimensions": array.shape[1],
                    "x_range": [float(np.min(array[:, 0])), float(np.max(array[:, 0]))],
                    "y_range": [float(np.min(array[:, 1])), float(np.max(array[:, 1]))],
                    "z_range": [float(np.min(array[:, 2])), float(np.max(array[:, 2]))],
                    "bounding_box": {
                        "width": float(np.max(array[:, 0]) - np.min(array[:, 0])),
                        "height": float(np.max(array[:, 1]) - np.min(array[:, 1])),
                        "depth": float(np.max(array[:, 2]) - np.min(array[:, 2]))
                    }
                }
            else:
                point_cloud_analysis[key] = {
                    "is_point_cloud": False,
                    "description": f"Shape: {array.shape}, 可能不是點雲數據"
                }
        
        self.analysis_result["point_cloud"] = point_cloud_analysis
        return point_cloud_analysis
    
    def generate_visualization(self, output_dir):
        """生成可視化圖表"""
        if self.data is None:
            return None
            
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        visualizations = []
        
        for key in self.data.files:
            array = self.data[key]
            
            # 如果是點雲數據，生成 3D 散點圖
            if len(array.shape) == 2 and array.shape[1] >= 3:
                fig = plt.figure(figsize=(12, 8))
                ax = fig.add_subplot(111, projection='3d')
                
                # 如果點太多，進行採樣
                if array.shape[0] > 10000:
                    indices = np.random.choice(array.shape[0], 10000, replace=False)
                    sample_array = array[indices]
                else:
                    sample_array = array
                
                ax.scatter(sample_array[:, 0], sample_array[:, 1], sample_array[:, 2], 
                          c=sample_array[:, 2] if array.shape[1] > 2 else 'blue', 
                          cmap='viridis', alpha=0.6, s=1)
                
                ax.set_xlabel('X')
                ax.set_ylabel('Y')
                ax.set_zlabel('Z')
                ax.set_title(f'3D Point Cloud: {key}')
                
                plt.tight_layout()
                plot_path = output_path / f"{key}_3d_plot.png"
                plt.savefig(plot_path, dpi=300, bbox_inches='tight')
                plt.close()
                
                visualizations.append(str(plot_path))
            
            # 生成數據分布直方圖
            if array.size > 0:
                fig, axes = plt.subplots(2, 2, figsize=(12, 8))
                fig.suptitle(f'Data Distribution: {key}')
                
                # 展平數據用於直方圖
                flat_data = array.flatten()
                
                # 直方圖
                axes[0, 0].hist(flat_data, bins=50, alpha=0.7)
                axes[0, 0].set_title('Value Distribution')
                axes[0, 0].set_xlabel('Value')
                axes[0, 0].set_ylabel('Frequency')
                
                # 箱線圖
                axes[0, 1].boxplot(flat_data)
                axes[0, 1].set_title('Box Plot')
                axes[0, 1].set_ylabel('Value')
                
                # 如果是點雲數據，顯示各維度的分布
                if len(array.shape) == 2 and array.shape[1] >= 3:
                    for i in range(min(3, array.shape[1])):
                        axes[1, 0].hist(array[:, i], bins=30, alpha=0.7, label=f'Dim {i}')
                    axes[1, 0].set_title('Coordinate Distributions')
                    axes[1, 0].set_xlabel('Value')
                    axes[1, 0].set_ylabel('Frequency')
                    axes[1, 0].legend()
                
                # 統計信息
                stats_text = f"""Statistics:
Mean: {np.mean(flat_data):.4f}
Std: {np.std(flat_data):.4f}
Min: {np.min(flat_data):.4f}
Max: {np.max(flat_data):.4f}
Shape: {array.shape}"""
                
                axes[1, 1].text(0.1, 0.5, stats_text, transform=axes[1, 1].transAxes, 
                               fontsize=10, verticalalignment='center')
                axes[1, 1].set_title('Statistics')
                axes[1, 1].axis('off')
                
                plt.tight_layout()
                plot_path = output_path / f"{key}_distribution.png"
                plt.savefig(plot_path, dpi=300, bbox_inches='tight')
                plt.close()
                
                visualizations.append(str(plot_path))
        
        self.analysis_result["visualizations"] = visualizations
        return visualizations
    
    def save_analysis_report(self, output_dir):
        """保存分析報告"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # 保存 JSON 報告
        report_path = output_path / f"{self.npz_file_path.stem}_analysis.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.analysis_result, f, indent=2, ensure_ascii=False)
        
        # 生成 Markdown 報告
        md_report = self.generate_markdown_report()
        md_path = output_path / f"{self.npz_file_path.stem}_analysis.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_report)
        
        print(f"📊 分析報告已保存到: {output_path}")
        return str(report_path), str(md_path)
    
    def generate_markdown_report(self):
        """生成 Markdown 格式的報告"""
        if not self.analysis_result:
            return "# NPZ 文件分析報告\n\n❌ 沒有可用的分析結果"
        
        md = f"""# NPZ 文件分析報告

## 文件信息
- **文件名**: {self.analysis_result['structure']['file_name']}
- **文件大小**: {self.analysis_result['structure']['file_size_mb']:.2f} MB

## 數據結構

"""
        
        for key, info in self.analysis_result['structure']['arrays'].items():
            md += f"""### {key}
- **形狀**: {info['shape']}
- **數據類型**: {info['dtype']}
- **元素數量**: {info['size']:,}
- **內存使用**: {info['memory_usage_mb']:.2f} MB
- **數值範圍**: [{info['min_value']:.4f}, {info['max_value']:.4f}]
- **平均值**: {info['mean_value']:.4f}
- **標準差**: {info['std_value']:.4f}

"""
        
        if 'point_cloud' in self.analysis_result:
            md += "## 點雲分析\n\n"
            for key, info in self.analysis_result['point_cloud'].items():
                if info.get('is_point_cloud', False):
                    md += f"""### {key} (點雲數據)
- **點數**: {info['num_points']:,}
- **維度**: {info['dimensions']}
- **X 範圍**: [{info['x_range'][0]:.4f}, {info['x_range'][1]:.4f}]
- **Y 範圍**: [{info['y_range'][0]:.4f}, {info['y_range'][1]:.4f}]
- **Z 範圍**: [{info['z_range'][0]:.4f}, {info['z_range'][1]:.4f}]
- **邊界框**: {info['bounding_box']['width']:.2f} × {info['bounding_box']['height']:.2f} × {info['bounding_box']['depth']:.2f}

"""
                else:
                    md += f"""### {key}
{info['description']}

"""
        
        if 'visualizations' in self.analysis_result:
            md += "## 可視化圖表\n\n"
            for viz_path in self.analysis_result['visualizations']:
                viz_name = Path(viz_path).name
                md += f"- [{viz_name}]({viz_name})\n"
        
        return md
    
    def run_full_analysis(self, output_dir):
        """運行完整分析"""
        print(f"🔍 開始分析 NPZ 文件: {self.npz_file_path}")
        
        if not self.load_file():
            return False
        
        print("📊 分析文件結構...")
        self.analyze_structure()
        
        print("🌐 分析點雲數據...")
        self.analyze_point_cloud()
        
        print("📈 生成可視化圖表...")
        self.generate_visualization(output_dir)
        
        print("💾 保存分析報告...")
        self.save_analysis_report(output_dir)
        
        print("✅ 分析完成！")
        return True


def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description='NPZ 文件分析工具')
    parser.add_argument('npz_file', help='NPZ 文件路徑')
    parser.add_argument('-o', '--output', default='./npz-analysis-output', 
                       help='輸出目錄 (默認: ./npz-analysis-output)')
    
    args = parser.parse_args()
    
    analyzer = NPZAnalyzer(args.npz_file)
    analyzer.run_full_analysis(args.output)


if __name__ == "__main__":
    main()

