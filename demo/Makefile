all: bundle

.PHONY: bundle
bundle: node_modules/.bin/webpack-dev-server
	nodejs ./node_modules/.bin/webpack

.PHONY: webpack-dev-server
webpack-dev-server: node_modules/.bin/webpack-dev-server
	NODE_ENV=development nodejs ./node_modules/.bin/webpack-dev-server --debug

node_modules/.bin/webpack-dev-server: node_modules

package-lock.json: package.json
	npm install

.PHONY: node_modules
node_modules: package.json package-lock.json
	npm install
