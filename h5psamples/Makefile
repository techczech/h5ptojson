VENV ?= .venv
PYTHON := $(VENV)/bin/python3
PIP := $(VENV)/bin/pip
FLASK := $(VENV)/bin/flask

.PHONY: install run test export clean

install:
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

run: install
	FLASK_APP=app.py $(FLASK) run

test: install
	$(PYTHON) -m unittest discover -s tests

export: install
	$(PYTHON) export_bundle.py corpus.h5p -o corpus-bundle.zip

clean:
	rm -rf $(VENV)
	rm -f corpus-bundle.zip
