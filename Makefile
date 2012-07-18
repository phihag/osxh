
default: help

help:
	@echo 'make targets:'
	@echo '  help          This message'
	@echo '  deps          Download and install all dependencies (for compiling / testing / CLI operation)'
	@echo '  test          Run tests'
	@echo '  cd            Generate and display coverage information'
	@echo '  clean         Remove temporary files'


deps:
	(node --version && npm --version) >/dev/null 2>/dev/null || sudo apt-get install nodejs npm
	npm install

test:
	@npm test

clean:
	@npm clean

cov: deps
	node_modules/.bin/cover run test.js
	node_modules/.bin/cover report html

coverage: cov

cd: cov
	xdg-open cover_html/index.html

.PHONY: default help deps test clean cov coverage cd


