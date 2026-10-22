SHELL := /bin/bash
PY := .venv/bin/python
.PHONY: doctor setup demo lab-up lab-check lab-down test reset-demo stop

doctor:
	@bash scripts/doctor.sh
setup:
	python -m venv .venv
	.venv/bin/pip install -r requirements.lock
	npm ci --prefix frontend
	@test -f data/processed/nodes.json || $(PY) scripts/acquire.py
	npm run build --prefix frontend
demo:
	@bash scripts/demo.sh
lab-up:
	docker compose --profile lab up -d
lab-check:
	$(PY) lab/scripts/check.py
lab-down:
	docker compose --profile lab down
test:
	$(PY) -m pytest -q
	node --experimental-strip-types tests/web_demo.mjs
	node --experimental-strip-types tests/walkthrough.mjs
	node --experimental-strip-types tests/packet.mjs
	node --experimental-strip-types tests/load_balance.mjs
	npm run build --prefix frontend
reset-demo:
	$(PY) scripts/reset.py
stop:
	@bash scripts/stop.sh
lab-controller:
	sudo .venv/bin/python lab/controller.py

test-graph:
	node --experimental-strip-types tests/web_demo.mjs
	node --experimental-strip-types tests/walkthrough.mjs
	node --experimental-strip-types tests/packet.mjs
	node --experimental-strip-types tests/load_balance.mjs
measure-planning:
	$(PY) scripts/measure_planning.py
