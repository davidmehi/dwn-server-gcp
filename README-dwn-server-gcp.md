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
