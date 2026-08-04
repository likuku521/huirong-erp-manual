#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""慧镕科技手册解析：manual.txt → data/manual.json"""
import json, re, os

BASE = os.path.dirname(os.path.abspath(__file__))
lines = open(os.path.join(BASE, 'manual.txt'), encoding='utf-8').readlines()
lines = [l.strip() for l in lines]

chapters = []
cur = None
sec = None  # 当前小节类型: flow/scope/rules/prep/steps/audit/shots/risks
step_counter = 0

def new_section(s):
    global sec, step_counter
    sec = s
    step_counter = 0

for ln in lines:
    if not ln:
        continue
    m = re.match(r'^第(\d+)章\s+(.+)$', ln)
    if m:
        cur = {'no': int(m.group(1)), 'title': m.group(2), 'flow': '', 'scope': '', 'rules': [], 'prep': [], 'steps': [], 'audit': [], 'shots': [], 'risks': []}
        chapters.append(cur)
        sec = None
        continue
    if not cur:
        continue
    # 小节标题
    m = re.match(r'^(\d+)\.(\d+)\s+(.+)$', ln)
    if m and m.group(1) == str(cur['no']):
        t = m.group(3)
        if '单据链路' in t: new_section('flow')
        elif '适用范围' in t: new_section('scope')
        elif '规则判断' in t: new_section('rules')
        elif '前置准备' in t: new_section('prep')
        elif '操作步骤' in t: new_section('steps')
        elif '审核关注' in t: new_section('audit')
        elif '截图' in t or '字段要求' in t: new_section('shots')
        elif '常见风险' in t: new_section('risks')
        else: sec = None
        continue
    # 核心单据流
    if ln.startswith('核心单据流'):
        cur['flow'] = ln.replace('核心单据流：', '').replace('核心单据流:', '')
        continue
    # 截图位
    m = re.match(r'^▎\s*FIG\.([\d\-]+)\s+(.+)$', ln)
    if m:
        cur['shots'].append({'no': m.group(1), 'title': m.group(2), 'ui': '', 'fields': '', 'note': ''})
        continue
    if sec == 'shots' and cur['shots']:
        last = cur['shots'][-1]
        if ln.startswith('界面：'): last['ui'] = ln[3:].strip()
        elif ln.startswith('字段：'): last['fields'] = ln[3:].strip()
        elif ln.startswith('说明：'): last['note'] = ln[3:].strip()
        continue
    # 步骤 3.4.x
    m = re.match(r'^\d+\.\d+\.(\d+)\s+(.+)$', ln)
    if m:
        cur['steps'].append({'title': m.group(2), 'desc': ''})
        continue
    # 列表项
    if ln.startswith('●') or ln.startswith('-'):
        txt = ln.lstrip('●- ').strip()
        if sec == 'rules': cur['rules'].append(txt)
        elif sec == 'prep': cur['prep'].append(txt)
        elif sec == 'audit': cur['audit'].append(txt)
        continue
    if ln.startswith('✘'):
        cur['risks'].append(ln.lstrip('✘ ').strip())
        continue
    if ln.startswith('⚠'):
        continue
    # 段落正文（适用范围等）
    if sec == 'scope' and not cur['scope']:
        cur['scope'] = ln
    elif sec == 'scope':
        cur['scope'] += ' ' + ln
    elif sec == 'steps' and cur['steps']:
        # 步骤补充描述
        cur['steps'][-1]['desc'] = ln
    elif sec == 'flow' and not cur['flow']:
        cur['flow'] = ln

# 生成站点meta
meta = {
    "siteTitle": "慧镕科技 · 金蝶云星空ERP",
    "siteSubtitle": "最终用户操作手册 · 亮色紧凑版",
    "company": "慧镕科技",
    "project": "金蝶云星空ERP业务流程方案",
    "product": "金蝶云星空ERP",
    "author": "金蝶软件（中国）有限公司",
    "date": "2026年6月",
    "version": "V1.0",
    "gatePassword": "HUIRONG2026",
    "bodies": ["慧镕科技"],
    "glDate": "",
    "pathFormat": "操作路径格式：【云服务名】-【功能模块】-【子功能】-【具体操作】",
    "notice": "本手册依据《慧镕科技业务流程方案V20260623.pptx》整理，覆盖生产、采购、销售、成本、关衡对接全部业务域。当前为待补截图版。"
}

# 角色映射（按章节）
def chapter_roles(no):
    if no <= 2: return ['all']
    if no in (18, 19): return ['fin']
    return ['ops', 'fin']

for ch in chapters:
    ch['roles'] = chapter_roles(ch['no'])

# ch1/ch2 手工补充（特殊结构）
ch1 = next((c for c in chapters if c['no'] == 1), None)
if ch1:
    ch1['scope'] = '本手册依据《慧镕科技业务流程方案V20260623.pptx》整理。PPT蓝图以流程图+流程要点形式描述了企业核心业务，本手册从PPT中提取：业务模块→关键流程→单据链路→操作步骤，面向最终用户输出可执行的操作指南。当前为待补截图版，补齐真实系统截图后可直接升级为正式版。'
    ch1['audience'] = ['生产计划员 / MRP运算人员', '采购员 / 仓库管理员 / 质检员', '生产车间操作人员 / 工艺员', '销售业务员 / 关务人员', '财务会计 / 成本会计', '实施顾问 / 培训讲师']
ch2 = next((c for c in chapters if c['no'] == 2), None)
if ch2:
    ch2['rules'] = [
        '保税物料与非保税物料分开管理，启用批次+仓库核算维度',
        '进口/出口报关业务在关衡关务系统操作，金蝶仅同步基础单据',
        '生产物料先领至车间仓，车间按实际消耗生成领料单（移库模式）',
        '物料档案需维护采购周期、质检周期、生产周期、是否保税、是否质检等属性',
        '拆植业务需指定主产品与联副产品比例；分拣/测试业务启用批次管理',
        '工程变更不支持文档管理；在制品返工需工艺员调整工艺路线',
        '关衡对接的单据审核后不允许反审核或变更',
        '成本核算采用月末加权平均法，按工序核算，在产品材料按完工产量分配'
    ]

data = {
    "meta": meta,
    "chapters": chapters,
    "appendix": {
        "processList": {
            "title": "业务模块总览",
            "desc": "根据PPT蓝图，慧镕科技ERP项目覆盖以下核心业务领域：",
            "table": [["业务域", "PPT页码", "核心单据链"],
                      ["原料分拣与测试", "P3", "采购入库单→分拣/测试工单→分拣入库单/测试入库单"],
                      ["MRP计划运算", "P4", "销售订单/预测→MRP运算→计划订单→生产工单/采购申请"],
                      ["普通生产", "P5-P7", "生产工单→领料(移库至车间仓)→工序汇报→生产入库单"],
                      ["工程变更", "P7", "ECN申请→BOM变更→在制品处理"],
                      ["委外管理", "P8", "委外工单→委外采购订单→委外发料→委外入库"],
                      ["进口采购", "P9", "采购申请→进口采购订单→收料通知→采购入库→同步关衡"],
                      ["普通采购", "P10", "采购申请→采购订单→收料通知→质检→采购入库"],
                      ["资产采购", "P11", "资产采购申请→采购订单→收料通知(验收审批)→资产入库"],
                      ["服务类采购", "P12", "服务采购申请→采购订单→收料通知(分批验收)"],
                      ["办公物资采购", "P13", "费用申请单→采购（不控库存）"],
                      ["采购退料", "P14", "采购退料申请→采购退料单→同步关衡"],
                      ["出口销售", "P15", "出口销售订单→发货通知→销售出库→同步关衡"],
                      ["普通销售", "P16", "销售订单→发货通知→销售出库"],
                      ["销售退货", "P17", "销售退货申请→销售退货单"],
                      ["成本核算", "P18", "费用归集→费用分配→成本计算→成本结转"],
                      ["关衡系统对接", "P19-P22", "主数据/采购/生产/销售单据→同步关衡"]]
        }
    },
    "approvalMatrix": [],
    "codeRules": [],
    "flowCharts": [{"id": "fc%d" % (i+1), "title": ch['title'], "steps": [s.strip() for s in ch['flow'].split('→')]} for i, ch in enumerate(chapters) if ch['flow']]
}

os.makedirs(os.path.join(BASE, 'data'), exist_ok=True)
with open(os.path.join(BASE, 'data', 'manual.json'), 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

n_shots = sum(len(c['shots']) for c in chapters)
n_steps = sum(len(c['steps']) for c in chapters)
print(f"OK → data/manual.json")
print(f"  章节 {len(chapters)} | 步骤 {n_steps} | 截图位 {n_shots} | 流程图 {len(data['flowCharts'])}")
for c in chapters:
    print(f"  ch{c['no']} {c['title'][:12]} steps={len(c['steps'])} shots={len(c['shots'])} risks={len(c['risks'])}")
