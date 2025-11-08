.PHONY: build dev lint test watch-test pre-commit-check install-pre-commit

build: node_modules
	npx vite build

dev: node_modules install-pre-commit
	npx vite --host 0

lint: node_modules
	npx prettier --write .

test: node_modules
	npx vitest run --coverage

watch-test: node_modules
	npx vitest --coverage

pre-commit-check: pre-commit-lint test

pre-commit-lint: node_modules
	@npx prettier --check $$( \
		git diff --name-only --cached \
	) || ( \
		npx prettier --write . ; \
		exit 1 ; \
	)

install-pre-commit: .git/hooks/pre-commit

.git/hooks/pre-commit:
	printf '%s\n' \
		'#!/bin/bash' \
		'' \
		'make pre-commit-check' \
		> '$@'
	chmod +x '$@'


.PHONY: dep-npm
deps: dep-npm node_modules

dep-npm:
	@npm --version >/dev/null 2>&1 || ( \
		printf '%s\n' \
			'NPM required!' \
			'https://nodejs.org/en/download/package-manager' ; \
		exit 1 ; \
	)

node_modules: package.json package-lock.json | dep-npm
	npm ci
