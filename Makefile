run:
	./node_modules/.bin/electron .

dependencies:
	docker run --rm -it -w /app -v "$PWD":/app node:8 npm i
