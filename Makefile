.PHONY: lint dev build test watch-test pre-commit-check install-pre-commit

build: lint dep-npm dep-node-modules
	npx vite build

dev: dep-npm dep-node-modules install-pre-commit
	npx vite --host 0

lint: dep-npm dep-node-modules
	npx prettier --write .

test: dep-npm dep-node-modules
	npx vitest run --coverage

watch-test: dep-npm dep-node-modules
	npx vitest --coverage

pre-commit-check: dep-npm dep-node-modules
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


.PHONY: dep-npm dep-node-modules

dep-npm:
	@npm -h 2>&1 | grep 'npm@' > /dev/null 2>&1 || ( \
		printf '%s\n' \
			'NPM required!' \
			'https://nodejs.org/en/download/package-manager' ; \
		exit 1 ; \
	)

dep-node-modules: package.json package-lock.json dep-npm
	@test -d node_modules > /dev/null 2>&1 \
		|| npm install
