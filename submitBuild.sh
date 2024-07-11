
# login to artifact registry to get token
npm run artifactregistry-login

# copy config file current folder, but name it without the preceding "." (it will get picked up by Dockerfile and renamed back)
cp ~/.npmrc ./npmrc

# start the build process
gcloud builds submit . 

# Delete file
rm npmrc
