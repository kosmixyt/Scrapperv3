bun build --compile --target=bun-linux-x64 ./src/index.ts --outfile myapp
docker build -t kosmix/scrapper2 .