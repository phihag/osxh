
default: help

help:
	@echo 'make targets:'
	@echo '  help          This message'
	@echo '  install-libs  Download and install all required libraries (for compiling / testing / CLI operation)'



install-libs:
	@if ! node --version >/dev/null 2>/dev/null; then \
		echo "Cannot find node. On debian, run $$ sudo apt-get install nodejs npm"; \
	fi
	@if ! node -e 'require("xmlshim")' 2>/dev/null; then \
		if ! npm --version >/dev/null 2>/dev/null; then \
			echo "Cannot find npm. On debian, run $$ sudo apt-get install npm"; exit 11; \
		fi; \
		npm install xmlshim; \
	fi


.PHONY: default help install-libs


