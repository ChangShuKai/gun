#!/usr/bin/env python3
"""
sentry_arp.py - Deco X50 免後台樓梯天井 RTT 哨兵雷達 (No-Router L2 Radar)
環境適配：透天厝 (1F 一台、2F 頭尾各一台 Deco X50，監聽站設於 3F)
物理原理：利用 RC 鋼筋水泥樓板吸收 (RTT > 15ms) vs 中空樓梯天井直通 (RTT < 6ms) 的延遲階躍
"""

import sys
import time
import json
import re
import subprocess
import threading
from collections import deque
from http.server import HTTPServer, BaseHTTPRequestHandler

# ==================== 監控參數配置 ====================
TARGET_IP = "192.168.68.105"  # 目標家人手機內網固定 IP
PORT = 8888
POLL_INTERVAL_SEC = 2.0       # 探測輪詢間隔 (秒)

# 階躍門檻值 (毫秒)
RED_THRESHOLD_MS = 6.0        # < 6ms 代表踏入樓梯天井直通區（致命逼近）
YELLOW_THRESHOLD_MS = 15.0    # > 15ms 代表在 1F/2F 跨樓層水泥阻隔遠端房間

# RTT 滑動窗口 (長度 5)
rtt_window = deque(maxlen=5)
consecutive_timeouts = 0
last_active_time = 0.0

lock = threading.Lock()


def probe_rtt_once(ip: str) -> float | None:
    """
    發送一次極速 L2 ARP (或 ping 快速備援) 探測，回傳往返延遲 (ms)。
    若超時 (100ms) 或無回應則回傳 None。
    """
    # 方案 1: arping -c 1 -w 0.1 (單次 timeout 100ms)
    try:
        t0 = time.perf_counter()
        res = subprocess.run(
            ["arping", "-c", "1", "-w", "0.1", ip],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=0.15
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000

        if res.returncode == 0:
            # 嘗試從 stdout 解析精確 RTT (例如: time=3.412 msec)
            match = re.search(r"time=([0-9.]+)\s*ms", res.stdout, re.IGNORECASE)
            if match:
                return float(match.group(1))
            return max(0.5, elapsed_ms)
    except (FileNotFoundError, subprocess.SubprocessError):
        pass

    # 方案 2: ping -c 1 -W 1 備援快速檢測
    try:
        t0 = time.perf_counter()
        res = subprocess.run(
            ["ping", "-c", "1", "-W", "1", ip],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=0.2
        )
        if res.returncode == 0:
            match = re.search(r"time=([0-9.]+)\s*ms", res.stdout, re.IGNORECASE)
            if match:
                return float(match.group(1))
            return (time.perf_counter() - t0) * 1000
    except Exception:
        pass

    return None


def probe_cycle(ip: str) -> float | None:
    """向目標發送 3 次極速探測，取有效響應之最小值代表當前射頻路徑"""
    rtts = []
    for _ in range(3):
        r = probe_rtt_once(ip)
        if r is not None:
            rtts.append(r)
        time.sleep(0.02)  # 20ms 間隔

    if len(rtts) > 0:
        return min(rtts)
    return None


def radar_worker():
    """背景常駐雷達探測執行緒"""
    global consecutive_timeouts, last_active_time
    print(f"[Radar] 樓梯天井 RTT 哨兵雷達已啟動，目標 IP: {TARGET_IP}...")

    while True:
        rtt = probe_cycle(TARGET_IP)

        with lock:
            if rtt is not None:
                consecutive_timeouts = 0
                last_active_time = time.time()
                rtt_window.append(rtt)
            else:
                consecutive_timeouts += 1
                # 若連續 3 次以上完全無回應，清空滑動窗口判定為休眠
                if consecutive_timeouts >= 3:
                    rtt_window.clear()

        time.sleep(POLL_INTERVAL_SEC)


def evaluate_fsm():
    """
    計算滑動窗口平均值，並評估三態空間威脅狀態機
    """
    with lock:
        now = time.time()
        if len(rtt_window) == 0:
            # 狀態一：GREEN (深度休眠 / 安全)
            return {
                "high_risk_detected": False,
                "threat_level": "GREEN",
                "target": {
                    "ip": TARGET_IP,
                    "active": False,
                    "rtt_ms": 0.0,
                    "location_estimate": "SLEEPING",
                    "status_desc": "目標手機處於休眠態，無網路轉發，判定安全。"
                }
            }

        avg_rtt = round(sum(rtt_window) / len(rtt_window), 1)
        active = True

        # 狀態三：RED (樓梯間逼近 / 致命警報) -> RTT < 6ms
        if avg_rtt < RED_THRESHOLD_MS:
            return {
                "high_risk_detected": True,
                "threat_level": "RED",
                "target": {
                    "ip": TARGET_IP,
                    "active": active,
                    "rtt_ms": avg_rtt,
                    "location_estimate": "STAIRWELL_APPROACHING_3F",
                    "status_desc": f"⚠️ 延遲驟降至 {avg_rtt}ms，樓梯天井射頻直通，目標逼近中！"
                }
            }

        # 狀態二：YELLOW (遠端使用中 / 警戒) -> 有應答且平均 RTT >= 6ms (通常 > 15ms)
        location = "REMOTE_ROOM_1F_2F" if avg_rtt >= YELLOW_THRESHOLD_MS else "TRANSIT_ZONE"
        desc = (
            f"📶 平均延遲 {avg_rtt}ms (RC 水泥板阻隔衰減)，目標正在遠端房間使用手機，尚未接近樓梯。"
            if avg_rtt >= YELLOW_THRESHOLD_MS
            else f"⚡ 平均延遲 {avg_rtt}ms (過渡區)，目標在活動中，保持留意。"
        )

        return {
            "high_risk_detected": False,
            "threat_level": "YELLOW",
            "target": {
                "ip": TARGET_IP,
                "active": active,
                "rtt_ms": avg_rtt,
                "location_estimate": location,
                "status_desc": desc
            }
        }


class RadarHTTPHandler(BaseHTTPRequestHandler):
    """HTTP API 伺服器處理器"""

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/status" or self.path == "/":
            payload = evaluate_fsm()
            payload["timestamp"] = int(time.time())
            payload["monitored_station"] = "3F_STATION"
            payload["mesh_topology"] = "3x Deco X50 (1F/2F/3F)"

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """支援動態更換監控目標 IP"""
        global TARGET_IP
        if self.path == "/config":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))
                new_ip = data.get("ip")
                if new_ip:
                    with lock:
                        TARGET_IP = new_ip
                        rtt_window.clear()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "ok", "target_ip": TARGET_IP}).encode("utf-8"))
                    return
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                return
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        return


def main():
    worker = threading.Thread(target=radar_worker, daemon=True)
    worker.start()

    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, RadarHTTPHandler)
    print(f"==================================================")
    print(f"📡 Deco X50 樓梯天井 RTT 哨兵雷達已啟動！")
    print(f"   監聽位置: 三樓站點 (3F Station)")
    print(f"   目標 IP: {TARGET_IP}")
    print(f"   API 位址: http://0.0.0.0:{PORT}/status")
    print(f"   判定階躍: < {RED_THRESHOLD_MS}ms 樓梯天井逼近 (RED) | > {YELLOW_THRESHOLD_MS}ms 水泥隔絕 (YELLOW)")
    print(f"==================================================")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Radar] 哨兵服務停止。")
        httpd.server_close()


if __name__ == "__main__":
    main()
