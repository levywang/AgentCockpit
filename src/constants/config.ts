import type { CodeSet, GatewayItem } from '../types';

export const CONFIG = {
  agents: [
    ['01', 'Retrieve'], ['02', 'Decompose'], ['03', 'Copywrite'], ['04', 'Design'],
    ['05', 'Coder'], ['06', 'QA Test'], ['07', 'Review'], ['08', 'Analytics'],
    ['09', 'Video Clip'], ['10', 'AdOps'], ['11', 'Support'], ['12', 'Archive']
  ] as [string, string][],
  taskNames: [
    'Competitor Intel Crawl', 'Requirement Decompose', 'Short Video Script', 'Cover Art Exploration',
    'Landing Page Revamp', 'API Endpoint Sync', 'Contract Terms Audit', 'Weekly Metrics Rollup',
    'RFP Proposal Gen', 'Outreach Prompt Tune', 'Asset Ingestion Sync', 'Release Preflight',
    'Feedback Clustering', 'Ad Creative A/B Test', 'KB Vector Reindex', 'Live Stream Highlights'
  ],
  workflows: [
    'Data Retrieval', 'Requirement Parse', 'Script Synthesis', 'Visual Design', 'Code Execution',
    'QA Validation', 'Compliance Audit', 'Metrics Rollup', 'Video Pipeline', 'Ad Optimization', 'Knowledge Graph'
  ],
  codeSets: [
    {
      file: 'dispatch.py',
      agent: 1,
      start: 7,
      lines: [
        "# Daily dispatch: decompose tasks, assign to agents",
        "tasks = load_queue('today')",
        "plan = split(tasks, by='skill')",
        "for step in plan:",
        "    agent = dispatch(step.skill)",
        "    out = agent.run(step)",
        "    if review(out) < 0.8:",
        "        out = agent.revise(out)",
        "    board.attach(step.id, out)"
      ]
    },
    {
      file: 'retrieve.py',
      agent: 0,
      start: 18,
      lines: [
        "# Competitor intelligence retrieval",
        "def retrieve(topic, k=20):",
        "    hits = search.web(topic, top=k)",
        "    docs = [fetch(h.url) for h in hits]",
        "    docs = dedupe(docs, by='title')",
        "    notes = summarize(docs, lang='en')",
        "    kb.save(topic, notes)",
        "    return notes"
      ]
    },
    {
      file: 'script.py',
      agent: 2,
      start: 31,
      lines: [
        "# Short video script: hook + beats + cta",
        "def write_script(topic, pains):",
        "    hook = pick_hook(pains, max_s=5)",
        "    body = outline(topic, beats=4)",
        "    cta = ask_for_comment(topic)",
        "    draft = llm.write(hook, body, cta)",
        "    return polish(draft, tone='punchy')"
      ]
    },
    {
      file: 'cover.py',
      agent: 3,
      start: 42,
      lines: [
        "# Multi-variant cover designs, pick top candidate",
        "specs = brief.cover_specs()",
        "imgs = []",
        "for i in range(6):",
        "    imgs.append(img.gen(specs, seed=i))",
        "scores = [rate(x, specs) for x in imgs]",
        "best = imgs[argmax(scores)]",
        "export(best, size='1080x1440')"
      ]
    },
    {
      file: 'tender.py',
      agent: 6,
      start: 56,
      lines: [
        "# RFP response generator: clause by clause",
        "reqs = parse_tender('rfp_spec.pdf')",
        "doc = Template('bid_template.docx')",
        "for r in reqs:",
        "    ans = draft_response(r, kb)",
        "    doc.fill(r.id, ans)",
        "missing = doc.check_required(reqs)",
        "assert not missing, missing",
        "doc.save('proposal_v3.docx')"
      ]
    },
    {
      file: 'weekly.py',
      agent: 7,
      start: 64,
      lines: [
        "# Weekly operations metrics rollup",
        "rows = db.query('tasks', week=42)",
        "done = [r for r in rows if r.done]",
        "rate = len(done) / len(rows)",
        "chart = plot.bar(group(done, 'agent'))",
        "report.add('completion_rate', f'{rate:.0%}')",
        "report.add_chart(chart)",
        "report.send(to='ops_channel')"
      ]
    },
    {
      file: 'preflight.py',
      agent: 5,
      start: 77,
      lines: [
        "# Deployment preflight checklist",
        "def preflight(build):",
        "    tests = run_tests(build, fast=True)",
        "    if tests.failed:",
        "        return block(tests.failed)",
        "    diff = compare(build, last_release)",
        "    if diff.risk > 0.3:",
        "        return ask_review(diff)",
        "    return approve(build)"
      ]
    },
    {
      file: 'ads_ab.py',
      agent: 9,
      start: 88,
      lines: [
        "# Ad creative testing: low-budget A/B run",
        "variants = load_creatives('batch_03')",
        "for v in variants:",
        "    ads.launch(v, budget=200)",
        "wait(hours=24)",
        "stats = ads.report(variants)",
        "win = max(stats, key=lambda s: s.ctr)",
        "ads.scale(win, budget=2000)"
      ]
    },
    {
      file: 'archive.py',
      agent: 11,
      start: 95,
      lines: [
        "# Asset archival & vector index sync",
        "files = scan('assets/weekly')",
        "for f in files:",
        "    tags = vision.tag(f)",
        "    kb.index(f, tags=tags)",
        "    move(f, to=f'archive/{tags[0]}')",
        "log.info(f'archived {len(files)} files')"
      ]
    }
  ] as CodeSet[]
};

export const CODEBITS = [
  'eqs = extract(spec.p)', 'solve(grid, dt=0.004)', 'log(claim, consts)', 'assert stable(state)', 'check_mass(state, ref)',
  'flag(blind_spots)', 'drift = compare(out, ref)', 'rerun(scene_07)', 'cite(page=12)', 'metric = spec.metric()', 'state = step(inputs)',
  'out = agent.run(step)', 'score = review(out)', 'board.attach(id, out)', 'route(task, skill)', 'queue.push(task)'
];

export const SOURCE_CATALOG: GatewayItem[] = [
  { tag: 'RAW_STREAM', proto: 'TCP/IPC', bus: 'BUS-A' },
  { tag: 'VECTOR_DB',  proto: 'VEC/ANN', bus: 'BUS-B' },
  { tag: 'SPEC_AST',   proto: 'LALR(1)', bus: 'BUS-C' },
  { tag: 'EVENT_BUS',  proto: 'PUBSUB',  bus: 'BUS-D' },
  { tag: 'SYNC_STATE', proto: 'CRDT/v2', bus: 'BUS-E' },
  { tag: 'GRAPH_KB',   proto: 'RDF/OWL', bus: 'BUS-F' },
  { tag: 'AGENT_RPC',  proto: 'gRPC/V8', bus: 'BUS-G' },
  { tag: 'KV_CACHE',   proto: 'MEM/L2',  bus: 'BUS-H' },
  { tag: 'BATCH_TX',   proto: 'ETL/WAL', bus: 'BUS-I' },
  { tag: 'METRIC_RX',  proto: 'OTEL/TS', bus: 'BUS-J' }
];

export const TAG_POOL = ['ACK', 'SYN', 'DAT', '0x7E', '0x9F', 'VEC', 'SIG', 'AST', 'IPC', 'CH1'];

export const SPIN = 0.16;

export const GLYPH = '01#%&*+=/<>▚▞▙▟░▒';

export const TAU = Math.PI * 2;

export const FONT = '"JetBrains Mono",ui-monospace,Menlo,monospace';

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
