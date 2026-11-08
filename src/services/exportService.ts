import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { HabitRecord } from '../types';

export class ExportService {
  /**
   * 將歷史紀錄轉換為徹底脫敏的純數值 CSV 矩陣
   * 格式規範：
   * date,duration_sec,avg_bpm,max_bpm,edge_counts,ehs_level
   * 2026-11-09 00:15:00,720,85,130,4,3
   */
  public static generateNumericCSV(records: HabitRecord[]): string {
    const headers = 'date,duration_sec,avg_bpm,max_bpm,edge_counts,ehs_level';
    const rows = records.map((record) => {
      // 格式化日期時間：YYYY-MM-DD HH:mm:00
      const d = new Date(record.timestamp);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateFormatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
        d.getDate()
      )} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

      const durationSec = record.durationSeconds || 0;

      // 提取 BPM (從快照或預設統計)
      let avgBpm = 75;
      let maxBpm = 110;
      if (record.snapshots && record.snapshots.length > 0) {
        const bpms = record.snapshots.map((s) => s.currentBPM).filter((b) => b > 0);
        if (bpms.length > 0) {
          avgBpm = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
          maxBpm = Math.max(...bpms);
        }
      }

      // 提取急停次數
      const edgeCounts = record.snapshots
        ? record.snapshots.filter((s) => s.stage === 'EDGE_HOLD').length
        : 0;

      // 提取 EHS 硬度評級 (1-4, 若無則填 3 或未評估)
      const ehsLevel = record.avgEHS ? Math.round(record.avgEHS) : 3;

      return `${dateFormatted},${durationSec},${avgBpm},${maxBpm},${edgeCounts},${ehsLevel}`;
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * 匯出並觸發系統分享面板 (AirDrop / 檔案儲存 / 郵件)
   */
  public static async exportDesensitizedReport(records: HabitRecord[]): Promise<string> {
    if (records.length === 0) {
      throw new Error('目前無任何歷史數據可供匯出');
    }

    const csvContent = ExportService.generateNumericCSV(records);
    const filename = `health_report_${Date.now()}.csv`;
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const filePath = `${baseDir}${filename}`;

    // 寫入本地快顯暫存檔案
    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: '匯出純數值健康報表 (無痕脫敏)',
        UTI: 'public.comma-separated-values-text',
      });
    }

    return filePath;
  }
}
