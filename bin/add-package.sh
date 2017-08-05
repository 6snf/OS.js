#!/bin/sh
# Usage: ./bin/add-package.sh namespace PackageName http://git-repository
repo=$1
name=$2
src=$3

mkdir src/packages/$repo
git clone $src src/packages/$repo/$name
pushd src/packages/$repo/$name
npm install
popd
node osjs config:add --name=repositories --value=$repo
node osjs build:manifest
node osjs build:package --name=$reoo/$name
