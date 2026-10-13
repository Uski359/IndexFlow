# Monitoring/Alerting Setup

## Prometheus
- Scrape config: `prometheus.yml` (default target `index-node:4000/metrics`).
- Alert rules: `alerts/index-node-rules.yml` (lag, coordinator errors, GraphQL error rate).
- Alertmanager target: `prometheus.yml` `alerting` section points to `alertmanager:9093` (update if different).
- To change targets, update `scrape_configs[0].static_configs[0].targets` in `prometheus.yml`.

## Alertmanager
- Sample config: `alertmanager.yml` with a placeholder email receiver.
- Replace SMTP host/credentials and recipient (`alerts@example.com`) with your notifier (email/webhook/PagerDuty, etc.).

## Run locally (example)
```bash
docker run -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/alerts:/etc/prometheus/alerts \
  prom/prometheus

docker run -p 9093:9093 \
  -v $(pwd)/alertmanager.yml:/etc/alertmanager/alertmanager.yml \
  prom/alertmanager
```

Make sure Alertmanager points to your notifier and Prometheus `alerting` section targets your Alertmanager URL (e.g., `http://host.docker.internal:9093`). Adjust thresholds in the rule file to fit your chain’s acceptable lag/error budget.
