FROM node:20

RUN apt update && apt install -y curl
RUN apt-get install xvfb -y
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 

# Set the working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and package-lock.json (or pnpm-lock.yaml if exists)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Copy the .env file temporarily
COPY .env .env

# Install dependencies and configure the environment
COPY . .
RUN pnpm install && pnpm add -g prisma && npx prisma db push --accept-data-loss --force-reset && npx prisma generate

# Remove the .env file after use

# install chrome
RUN apt install gnupg -y
RUN curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add
RUN echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list
RUN apt-get -y update
RUN apt-get -y install google-chrome-stable

# Expose the port the app runs on
EXPOSE 3000

RUN rm .env

CMD ["pnpm", "run", "start"]