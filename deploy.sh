#!/bin/bash
echo "Building..."
npm run build
echo "Deploying..."
rsync -avz -e "ssh -p 2222" ~/Desktop/imp2/dist/ root@72.56.249.243:/var/www/pix/ --delete
echo "Done! https://pix-dodo.ru"
