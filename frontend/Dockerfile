FROM node:20-alpine

WORKDIR /app

# We will initialize next app if package.json doesn't exist, otherwise just install and run
# Actually let's just initialize the next app directly in the entrypoint or use a pre-created one.
# For simplicity, we will copy package.json if it exists.

COPY package.json ./
RUN if [ -f "package.json" ]; then npm install; else npx -y create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm && npm install; fi

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
