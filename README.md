OpenStack Auth Operator
======================

[![GitHub license](https://img.shields.io/badge/license-AGPLv3-blue.svg)](https://raw.githubusercontent.com/fidash/operator-auth/master/LICENSE.txt)
[![Build Status](https://build.conwet.fi.upm.es/jenkins/view/FI-Dash/job/Operator%20Auth/badge/icon)](https://build.conwet.fi.upm.es/jenkins/view/FI-Dash/job/Operator%20Auth/)

The OpenStack Auth Operator is a WireCloud operator that provides automatic authentication to openstack with your logged user.

Build
-----

Be sure to have installed [Node.js](http://node.js) in your system. For example, you can install it on Ubuntu and Debian running the following commands:

```bash
curl -sL https://deb.nodesource.com/setup | sudo bash -
sudo apt-get install nodejs
sudo apt-get install npm
```

If you want the last version of the operator, you should change to the `develop` branch:

```bash
git checkout develop
```

Install other npm dependencies by running: (need root because some libraries use applications, check package.json before to be sure)

```bash
sudo npm install
```

For build the operator you need download grunt:

```bash
sudo npm install -g grunt-cli
```

And now, you can use grunt:

```bash
grunt
```

If everything goes well, you will find a wgt file in the `dist` folder.

## Settings

- `cloudurl`: This is the URL where OpenStack are.

## Wiring


### Input Endpoints


### Output Endpoints

- `authentication`: Send the data needed to authenticate:
  - `token`: String (The auth token)
  - `data`: Object (Some data to automatize the JStack initialization)


## Usage


## Reference

- [FIWARE Mashup](https://mashup.lab.fiware.org/)

## Copyright and License

Copyright (c) 2015 UPM-ETSIINF
