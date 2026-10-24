#!/usr/bin/env python3
"""生成 CleanSheet 测试数据：Amazon 结算单样本（UTF-8）+ Shopify 订单样本（GBK）。"""
import csv
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'testdata')
os.makedirs(OUT, exist_ok=True)

# ---------- 1. amazon-settlement-sample.csv（UTF-8，含刻意异常） ----------
amazon_headers = [
    'settlement-id', 'settlement-start-date', 'settlement-end-date',
    'order-id', 'sku', 'quantity', 'amount-type', 'amount-description',
    'amount', 'currency',
]
amazon_rows = [
    ['1700000001', '2026-09-01', '2026-09-15', '701-1111111-1111111', 'SKU-A01', '2', 'Principal', 'Product charges', '128.00', 'USD'],
    ['1700000001', '2026-09-01', '2026-09-15', '701-1111111-1111111', 'SKU-A01', '2', 'Commission', 'Marketplace fee', '-19.20', 'USD'],
    ['1700000001', '2026-09-01', '2026-09-15', '701-2222222-2222222', 'SKU-B02', '1', 'Principal', 'Product charges', '64.50', 'USD'],
    ['1700000001', '2026-09-01', '2026-09-15', '701-2222222-2222222', 'SKU-B02', '1', 'Shipping', 'Shipping charges', '6.99', 'USD'],
    ['1700000001', '2026-09-01', '2026-09-15', '701-3333333-3333333', 'SKU-C03', '3', 'Principal', 'Product charges', '89.97', 'EUR'],
    ['1700000001', '2026-09-01', '2026-09-15', '701-4444444-4444444', 'SKU-A01', '1', 'Principal', 'Product charges', '45.00', 'USD'],
    # 异常：空订单号
    ['1700000001', '2026-09-01', '2026-09-15', '', 'SKU-D04', '1', 'Principal', 'Product charges', '32.00', 'USD'],
    # 异常：非法日期
    ['1700000001', '2026-13-45', '2026-09-15', '701-5555555-5555555', 'SKU-E05', '1', 'Principal', 'Product charges', '21.50', 'USD'],
    # 异常：重复订单号（与第 6 行重复）
    ['1700000001', '2026-09-01', '2026-09-15', '701-4444444-4444444', 'SKU-A01', '1', 'Principal', 'Product charges', '45.00', 'USD'],
    # 异常：超大金额
    ['1700000001', '2026-09-01', '2026-09-15', '701-6666666-6666666', 'SKU-F06', '1', 'Principal', 'Product charges', '2500000.00', 'USD'],
    ['1700000002', '2026-09-16', '2026-09-30', '701-7777777-7777777', 'SKU-B02', '2', 'Principal', 'Product charges', '129.00', 'GBP'],
    ['1700000002', '2026-09-16', '2026-09-30', '701-7777777-7777777', 'SKU-B02', '2', 'Refund', 'Refund', '-129.00', 'GBP'],
    ['1700000002', '2026-09-16', '2026-09-30', '701-8888888-8888888', 'SKU-G07', '5', 'Principal', 'Product charges', '199.95', 'USD'],
    ['1700000002', '2026-09-16', '2026-09-30', '701-9999999-9999999', 'SKU-H08', '1', 'Principal', 'Product charges', '15800', 'JPY'],
]
with open(os.path.join(OUT, 'amazon-settlement-sample.csv'), 'w', encoding='utf-8', newline='') as f:
    w = csv.writer(f)
    w.writerow(amazon_headers)
    w.writerows(amazon_rows)

# ---------- 2. shopify-orders-sample-gbk.csv（GBK 编码，演示编码识别） ----------
shopify_headers = ['Name', 'Email', 'Currency', 'Total', 'Lineitem sku', 'Lineitem name', 'Paid at']
shopify_rows = [
    ['#1001', 'buyer1@example.com', 'USD', '128.00', 'SKU-A01', '无线蓝牙耳机', '2026-09-03 10:22:11'],
    ['#1002', 'buyer2@example.com', 'USD', '64.50', 'SKU-B02', '手机支架', '2026-09-04 14:05:33'],
    ['#1003', 'buyer3@example.com', 'EUR', '89.97', 'SKU-C03', '智能台灯', '2026-09-05 09:12:47'],
    ['#1004', 'buyer4@example.com', 'USD', '45.00', 'SKU-A01', '无线蓝牙耳机', '2026-09-06 20:44:02'],
    ['#1005', 'buyer5@example.com', 'USD', '199.95', 'SKU-G07', '户外露营灯', '2026-09-07 11:30:59'],
]
with open(os.path.join(OUT, 'shopify-orders-sample-gbk.csv'), 'w', encoding='gbk', newline='') as f:
    w = csv.writer(f)
    w.writerow(shopify_headers)
    w.writerows(shopify_rows)

print('testdata written:', sorted(os.listdir(OUT)))
