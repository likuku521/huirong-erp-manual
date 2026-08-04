#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""海南格林沃德操作指南生成器：合并 JSON 数据 + 模板 → 单文件 index.html"""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))

def load(name):
    with open(os.path.join(BASE, "data", name), encoding="utf-8") as f:
        return json.load(f)

def main():
    data = load("manual.json")
    meta = data["meta"]

    def read(p):
        with open(os.path.join(BASE, p), encoding="utf-8") as f:
            return f.read()

    head = read("template_head.html")
    body = read("template_body.html")
    render_js = read("render.js")
    app_js = read("app.js")

    data_json = json.dumps(data, ensure_ascii=False)
    data_json = data_json.replace("</", "<\\/")

    html = head + body
    html = html.replace("__SITE_TITLE__", meta["siteTitle"])
    html = html.replace("__VERSION__", meta["version"])
    html = html.replace("__DATE__", meta["date"])
    html = html.replace("__DATA_JSON__", data_json)
    html = html.replace("__RENDER_JS__", render_js)
    html = html.replace("__APP_JS__", app_js)

    out = os.path.join(BASE, "index.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)

    if "chapters" in data:
        n_ch = len(data["chapters"])
        n_sec = sum(len(c.get("sections", [])) for c in data["chapters"])
        n_steps = sum(len(s.get("steps", [])) for c in data["chapters"] for s in c.get("sections", []))
        n_shots = sum(1 for c in data["chapters"] for s in c.get("sections", []) for st in s.get("steps", []) if st.get("shot"))
        print(f"  章节 {n_ch} | 小节 {n_sec} | 步骤 {n_steps} | 截图位 {n_shots}")
    elif "scenes" in data:
        n_sc = len(data["scenes"])
        n_docs = sum(len(sc.get("docs", [])) for sc in data["scenes"])
        n_steps = sum(len(d.get("steps", [])) for sc in data["scenes"] for d in sc.get("docs", []))
        n_shots = sum(len(d.get("shots", [])) for sc in data["scenes"] for d in sc.get("docs", []))
        print(f"  场景 {n_sc} | 单据 {n_docs} | 步骤 {n_steps} | 截图位 {n_shots}")
    print(f"  大小 {os.path.getsize(out)/1024:.1f} KB")

if __name__ == "__main__":
    main()
