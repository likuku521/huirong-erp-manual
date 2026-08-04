#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""19章 → 5大场景 + 单据二级目录 + 重复单据合并
场景 = 一张大业务流程图；二级 = 单据；重复单据集中定义，其他场景引用
"""
import json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(BASE, 'data', 'manual.json'), encoding='utf-8'))
chs = {c['no']: c for c in data['chapters']}

def steps_of(no):
    return [(s['title'], s.get('desc','')) for s in chs[no].get('steps', [])]
def shots_of(no, prefix):
    return [{'no': s['no'], 'title': s['title'], 'ui': s.get('ui',''), 'fields': s.get('fields',''), 'note': s.get('note','')} for s in chs[no].get('shots', [])]
def risks_of(no):
    return chs[no].get('risks', [])
def rules_of(no):
    return chs[no].get('rules', [])

# ===== 单据定义（每个单据：来源章、步骤关键词过滤、截图、规则、风险） =====
DOCS = {
 'purchase': [  # 场景1 采购管理
  {'id':'p-req','no':'A1','title':'采购申请单','src':[9,10,11,13],
   'kw':['采购申请','申请单'],
   'desc':'所有采购业务的第一步：先提采购申请，审批通过后才能下单。办公物资采购直接用费用申请单（不控库存）。进口采购需在物料档案维护保税/质检属性。',
   'shots':['FIG.13-1','FIG.11-1'],'rules_from':[10,13],'risks_from':[]},
  {'id':'p-order','no':'A2','title':'采购订单','src':[9,10,12],
   'kw':['采购订单','进口采购订单','服务订单','关联进口许可证'],
   'desc':'采购订单是采购的执行单据。进口采购订单需按物料关联进口许可证；服务类采购订单用于服务采购，支持分批验收。',
   'shots':['FIG.9-1','FIG.10-1','FIG.12-1'],'rules_from':[9,12],'risks_from':[9]},
  {'id':'p-receipt','no':'A3','title':'收料通知单','src':[9,10,12],
   'kw':['收料通知','确认收货'],
   'desc':'供应商发货后，执行收料通知确认收货信息。服务类采购支持分批验收，注意分批金额不能超出合同金额。',
   'shots':['FIG.12-2'],'rules_from':[12],'risks_from':[12]},
  {'id':'p-in','no':'A4','title':'采购入库单（含保税）','src':[9,10,11],
   'kw':['采购入库','入库单','保税'],
   'desc':'货到后执行采购入库。保税物料必须入保税仓；资产采购入库需关联验收审批；入库后系统自动同步至关衡系统。',
   'shots':['FIG.9-2','FIG.10-3'],'rules_from':[9,10],'risks_from':[9]},
  {'id':'p-qc','no':'A5','title':'来料质检单','src':[10],
   'kw':['质检','来料检验'],
   'desc':'物料档案登记"是否需质检"决定是否需要质检环节。质检员执行来料检验，检验结果决定是否入库。',
   'shots':['FIG.10-2'],'rules_from':[10],'risks_from':[]},
  {'id':'p-asset','no':'A6','title':'资产验收单','src':[11],
   'kw':['验收','资产'],
   'desc':'资产采购的收料通知需走验收审批流程，验收通过后资产入库，形成固定资产台账。',
   'shots':['FIG.11-2'],'rules_from':[11],'risks_from':[11]},
  {'id':'p-return','no':'A7','title':'采购退料单','src':[14],
   'kw':['退料'],
   'desc':'采购入库后发现质量问题需退货时使用。基于采购入库单发起退料申请，审批通过后执行退料出库，数据同步关衡。',
   'shots':['FIG.14-1','FIG.14-2'],'rules_from':[14],'risks_from':[14]},
  {'id':'p-office','no':'A8','title':'办公物资采购（费用申请）','src':[13],
   'kw':['费用申请','办公'],
   'desc':'行政办公类物资采购。不用创建物料档案，费用申请单直接填写采购物资描述，不进行出入库管控。',
   'shots':['FIG.13-1'],'rules_from':[13],'risks_from':[13]},
 ],
 'production': [  # 场景2 生产制造
  {'id':'m-mrp','no':'B1','title':'MRP运算方案与计划订单','src':[4],
   'kw':['MRP','运算','计划订单'],
   'desc':'生产计划员根据销售订单和需求预测，通过MRP运算生成生产计划和采购计划。运算结果生成计划订单，可投放为生产工单（自制件）或采购申请（外购件）。',
   'shots':['FIG.4-1','FIG.4-2','FIG.4-3'],'rules_from':[4],'risks_from':[4]},
  {'id':'m-mo','no':'B2','title':'生产工单','src':[5],
   'kw':['生产工单'],
   'desc':'生产工单是生产执行的源头单据。需指定生产类型（普通生产/拆植等）、BOM版本，审批后执行生产。',
   'shots':['FIG.5-1'],'rules_from':[5],'risks_from':[5]},
  {'id':'m-pick','no':'B3','title':'领料单（移库至车间仓）','src':[5],
   'kw':['领料','移库'],
   'desc':'生产物料先领至车间仓，车间按实际消耗生成领料单（移库模式）。拆植业务需指定主产品与联副产品比例。',
   'shots':['FIG.5-2'],'rules_from':[5],'risks_from':[5]},
  {'id':'m-report','no':'B4','title':'工序汇报单','src':[5,6],
   'kw':['工序汇报','汇报'],
   'desc':'车间按工艺路线完成各道工序后执行工序汇报，记录完工数量与工时，是成本核算的基础数据。',
   'shots':['FIG.5-3'],'rules_from':[5],'risks_from':[5]},
  {'id':'m-in','no':'B5','title':'生产入库单','src':[5],
   'kw':['生产入库','入库'],
   'desc':'生产完成并汇报后执行生产入库单，成品入成品仓，系统按批次核算产品成本。',
   'shots':['FIG.5-4'],'rules_from':[5],'risks_from':[5]},
  {'id':'m-rework','no':'B6','title':'返工工单','src':[6],
   'kw':['返工'],
   'desc':'在库产品因质量问题退回车间返工。返工用料清单只含产品，耗材由工艺员额外维护，需制定返工专用工艺路线。',
   'shots':['FIG.6-1','FIG.6-2','FIG.6-3'],'rules_from':[6],'risks_from':[6]},
  {'id':'m-ecn','no':'B7','title':'工程变更单（ECN）','src':[7],
   'kw':['ECN','工程变更','BOM'],
   'desc':'BOM生效后调整子项物料单位用量、增减物料、变更替代料。变更需通过ECN流程审批后才生效，在制品由工艺员评估处理。',
   'shots':['FIG.7-1','FIG.7-2','FIG.7-3'],'rules_from':[7],'risks_from':[7]},
  {'id':'m-sort','no':'B8','title':'分拣/测试工单','src':[3],
   'kw':['分拣','测试'],
   'desc':'进口采购废旧内存条等多品种混杂原料，统一报关入库后再分拣成不同原料；原料经测试工序转换成其他产品。启用批次管理。',
   'shots':['FIG.3-1','FIG.3-2','FIG.3-3'],'rules_from':[3],'risks_from':[3]},
  {'id':'m-outsource','no':'B9','title':'委外工单/发料/入库','src':[8],
   'kw':['委外'],
   'desc':'工单普通委外业务。需创建委外BOM、委外工单，通过委外工单关联生成委外采购订单，物料发至委外仓库，加工完成后委外入库。',
   'shots':['FIG.8-1','FIG.8-2','FIG.8-3'],'rules_from':[8],'risks_from':[8]},
 ],
 'sales': [  # 场景3 销售管理
  {'id':'s-so','no':'C1','title':'销售订单','src':[15,16],
   'kw':['销售订单'],
   'desc':'销售业务起点。出口销售订单需按物料关联出口许可证；普通销售订单选择客户和物料、数量、价格。',
   'shots':['FIG.15-1','FIG.16-1'],'rules_from':[15,16],'risks_from':[15]},
  {'id':'s-ship','no':'C2','title':'发货通知单','src':[15,16],
   'kw':['发货通知'],
   'desc':'确认发货计划，通知仓库备货出库。',
   'shots':[],'rules_from':[15,16],'risks_from':[]},
  {'id':'s-out','no':'C3','title':'销售出库单','src':[15,16],
   'kw':['销售出库','出库单'],
   'desc':'执行销售出库扣减库存。出口销售保税物料从保税仓出库，出库后同步关衡；普通销售标准出库。',
   'shots':['FIG.15-2','FIG.16-2'],'rules_from':[15,16],'risks_from':[16]},
  {'id':'s-return','no':'C4','title':'销售退货单','src':[17],
   'kw':['退货'],
   'desc':'销售出库后客户退货。基于销售出库单发起退货申请，审批通过后执行退货入库。出口退货报关在关衡系统操作。',
   'shots':['FIG.17-1','FIG.17-2'],'rules_from':[17],'risks_from':[17]},
 ],
 'cost': [  # 场景4 成本核算
  {'id':'c-collect','no':'D1','title':'费用归集','src':[18],
   'kw':['费用归集'],
   'desc':'制造费用归集部门包括生产部、仓储、采购、工程设备、质量部。确认各费用项目已入账。',
   'shots':['FIG.18-1'],'rules_from':[18],'risks_from':[18]},
  {'id':'c-alloc','no':'D2','title':'费用分配','src':[18],
   'kw':['费用分配'],
   'desc':'车间按自定义比例分摊费用，车间内按产量或手工指定分配。',
   'shots':['FIG.18-2'],'rules_from':[18],'risks_from':[18]},
  {'id':'c-calc','no':'D3','title':'成本计算','src':[18],
   'kw':['成本计算'],
   'desc':'月末加权平均法，核算维度为批次+仓库，按工序核算。在产品材料按完工产量分配，工费不参与分摊。',
   'shots':['FIG.18-3'],'rules_from':[18],'risks_from':[18]},
  {'id':'c-carry','no':'D4','title':'成本结转','src':[18],
   'kw':['成本结转','凭证'],
   'desc':'成本计算完成后执行成本结转，生成成本凭证。',
   'shots':['FIG.18-4'],'rules_from':[18],'risks_from':[18]},
 ],
 'gh': [  # 场景5 关衡对接
  {'id':'g-sync','no':'E1','title':'关衡数据同步','src':[19],
   'kw':['关衡','同步'],
   'desc':'主数据/采购/生产/销售单据审核后同步至关衡关务系统。保税判断是关键，同步后不允许反审核或变更。',
   'shots':['FIG.19-1','FIG.19-2','FIG.19-3'],'rules_from':[19],'risks_from':[19]},
 ],
}

# ===== 场景定义（一张大流程图） =====
SCENES = [
 {'id':'purchase','no':1,'title':'采购管理','icon':'🛒',
  'flow':['采购申请','采购订单','收料通知','质检/验收','采购入库(保税仓)','采购退料'],
  'desc':'覆盖进口采购、普通采购、资产采购、服务类采购、办公物资采购与采购退料全部采购业务。进口业务关联许可证并同步关衡系统。'},
 {'id':'production','no':2,'title':'生产制造','icon':'🏭',
  'flow':['MRP运算','生产工单','移库领料','工序汇报','生产入库','返工/ECN/委外'],
  'desc':'覆盖MRP计划运算、普通生产、生产返工、工程变更（ECN）、委外管理与原料分拣测试。生产物料先领至车间仓，按实际消耗生成领料单。'},
 {'id':'sales','no':3,'title':'销售管理','icon':'📦',
  'flow':['销售订单','发货通知','销售出库','销售退货'],
  'desc':'覆盖出口销售（关联许可证、同步关衡）、普通销售与销售退货业务。'},
 {'id':'cost','no':4,'title':'成本核算','icon':'🧮',
  'flow':['费用归集','费用分配','成本计算','成本结转'],
  'desc':'月末加权平均法，按工序核算，批次+仓库核算维度。制造费用按自定义比例分摊，在产品材料按完工产量分配。'},
 {'id':'gh','no':5,'title':'关衡关务对接','icon':'🌐',
  'flow':['主数据/单据审核','关衡同步','关衡确认','状态锁定'],
  'desc':'进口/出口报关业务在关衡关务系统操作，金蝶同步基础单据。同步后不允许反审核或变更。'},
]

def build_doc(d, scene_id):
    steps = []
    for no in d['src']:
        for (t, desc) in steps_of(no):
            if any(k in t for k in d['kw']) and t not in [s['title'] for s in steps]:
                steps.append({'title': t, 'desc': desc})
    # 兜底：若关键词未命中任何步骤，纳入该来源章前2步（适用范围说明）
    if not steps:
        for no in d['src']:
            for (t, desc) in steps_of(no)[:3]:
                if t not in [s['title'] for s in steps]:
                    steps.append({'title': t, 'desc': desc})
    shots = []
    for sn in d['shots']:
        key = sn.replace('FIG.','').strip()
        for no in d['src']:
            for s in shots_of(no, ''):
                if s['no'] == key and not any(x['no'] == key for x in shots):
                    shots.append(s)
    rules = []
    for no in d['rules_from']:
        for r in rules_of(no):
            if r not in rules: rules.append(r)
    risks = []
    for no in d['risks_from']:
        for r in risks_of(no):
            if r not in risks: risks.append(r)
    return {'id': d['id'], 'no': d['no'], 'title': d['title'], 'desc': d['desc'],
            'steps': steps, 'shots': shots, 'rules': rules, 'risks': risks}

scenes = []
for sc in SCENES:
    docs = [build_doc(d, sc['id']) for d in DOCS[sc['id']]]
    scenes.append({'id': sc['id'], 'no': sc['no'], 'title': sc['title'], 'icon': sc['icon'],
                   'flow': sc['flow'], 'desc': sc['desc'], 'docs': docs})

out = {
    'meta': data['meta'],
    'scenes': scenes,
    'appendix': data['appendix']
}
json.dump(out, open(os.path.join(BASE, 'data', 'manual.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

print('OK → data/manual.json (场景重构)')
for sc in scenes:
    print(f"  场景{sc['no']} {sc['title']}: {len(sc['docs'])}单据, 流程{len(sc['flow'])}步")
    for d in sc['docs']:
        print(f"    {d['no']} {d['title']}: steps={len(d['steps'])} shots={len(d['shots'])} risks={len(d['risks'])}")
