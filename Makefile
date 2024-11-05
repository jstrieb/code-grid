.PHONY: lint dev build

build: lint dep-npm dep-node-modules
	npx vite build

dev: dep-npm dep-node-modules
	npx vite --host 0

lint: dep-npm dep-node-modules
	npx prettier --write .


.PHONY: dep-npm dep-node-modules

dep-npm:
	@npm -h 2>&1 | grep 'npm@' > /dev/null 2>&1 || ( \
		printf '%s\n' 'NPM required!' 'https://nodejs.org/en/download/package-manager' ; \
		exit 1 ; \
	)

dep-node-modules: package.json package-lock.json dep-npm
	@test -d node_modules > /dev/null 2>&1 \
		|| npm install
