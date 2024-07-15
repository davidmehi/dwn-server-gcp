# dwn-server-gcp

This repo is the customized version of dwn-server for GCP

The main branch is forked from (https://github.com/TBD54566975/dwn-server/tree/main)[dwn-server] and synced with the main branch from dwn-server from time to time.

Each release is created as its own branch.  It contains the customizations, which deviates from dwn-server

Customizations
 * PG database configuration
   * This is done via env variables in the cloudbuild.yaml file
 * Import of the dwn-gcs-datastore
   * This is built separately and copied to the dwn-server-gcp node_modules folder.
 * Source changes (src/storage.ts) to use dwn-gcs-datastore
 * Changes to package.json
   * Includes dwn-gcs-datastore as the dependency
   * The versions should match dwn-server versions (except where it needs to be customized)

# Changes

1. If there are updates that need to happen, create a branch first and switch to it

`git checkout -b {branch-name}`

Example (https://medium.com/@abhay.pixolo/naming-conventions-for-git-branches-a-cheatsheet-8549feca2534)[(branch naming conventions)]

`git checkout -b release/dwn-server-gcp-0.1.16`

2. Confirm code changes are included

2.1 in package.json, confirm:
      * dwn-sdk-js is up to date
      * dwn-sql-store is up to date.  
      * @local-npm-registry/dwn-gcs-datastore is up to date
      * @local-npm-registry/dwn-gcs-dwn-message-stream-pub-sub is up to date
2.3 Confirm src/storage.ts has these changes:

```
/* Line 26 */
import { DataStoreGcs } from '@local-npm-registry/dwn-gcs-datastore';

@@ -40,6 +43,7 @@ export enum BackendTypes {
  SQLITE = 'sqlite',
  MYSQL = 'mysql',
  POSTGRES = 'postgres',
  GCS = 'gcs'
}

  - const dataStore: DataStore = getStore(config.dataStore, EStoreType.DataStore);
  + const dataStore: DataStore = getGcsStore(); // getStore(config.dataStore, EStoreType.DataStore);

/* line 104 */
function getGcsStore(): DataStore {
  return new DataStoreGcs();
}

function getStore(
  storeString: string,
  storeType: EStoreType.DataStore,
@@ -121,6 +129,9 @@ function getStore(storeString: string, storeType: EStoreType): StoreType {
    case BackendTypes.POSTGRES:
      return getDBStore(getDialectFromURI(storeURI), storeType);

    case BackendTypes.GCS:
      return getGcsStore();

    default:
      throw invalidStorageSchemeMessage(storeURI.protocol);
  }
```

2.4 Dockerfile
# Line 1
FROM node:20-buster

# Add lines 10-11
COPY npmrc ./.npmrc
COPY TOS.txt ./TOS.txt

2.5 TOS Files
Add TOS.txt


2.6 Update entrypoint.sh to the following:

exec node /dwn-server/dist/esm/main.js

2.6 Update package.json
add at line 98:
"artifactregistry-login": "npx google-artifactregistry-auth"

3. Configure the Event Stream for PubSub

In src/dwn-server.ts, around line 105/106, set eventStream to the EventEmitterStream in @local-npm-registry/dwn-message-stream-pub-sub
```
eventStream = new EventEmitterStream();
```

4. Add cloudbuild.yaml and submitBuild.sh
5. Run tests:


* Set env variables
* Open cloud-sql-proxy for local db connection
* configure gcloud auth

```
npm install
gcloud auth login --update-adc
gcloud config set project {project-id}
gcloud auth application-default set-quota-project {project-id}
(New terminal window)
./cloud-sql-proxy --address 0.0.0.0 --port 1234 {db-connection-string}

export DWN_GCS_BUCKET_NAME={gcs-bucket-name}
export DWN_PG_HOST=127.0.0.1
export DWN_PG_PORT=1234
export DWN_PG_DB=dwn_data_store_dev
export DWN_PG_USER=dwn-app
export DWN_PG_PWD=***

npm run artifactregistry-login

npm run test

```

6. Increment version number

If the change is big enough to warrant a version update, then increase the version number in package.json

7. Remove password reference in cloudbuild.yaml.  Commit changes and push branch


```
git checkout main
git merge release/dwn-server-gcp-0.1.16
git push
```

8. Deploy to Cloud Run

Update cloudbuild.yaml to match environment.

`submitBuild.sh`


9. Restore cloudbuild.yaml to original version, removing passwords and other sensitive config
