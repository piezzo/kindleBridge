# kindleBridge

An online version is available at [http://isnogoood.de:8080/](http://isnogoood.de:8080/)

[![Build Status](https://travis-ci.org/piezzo/kindleBridge.svg?branch=master)](https://travis-ci.org/piezzo/kindleBridge.svg?branch=master)

## What is this?

kindleBridge is a docker/nodejs based service to convert URLs reveived in an email into an eBook reader-friendly format (and optionally forward it to the eBook reader, again, by email).

## Features

* output can be pdf or mobi (mobi needs an external binary in the programs root folder)
* basic feedback about results on webpage
* interaction with the program is usually a single email

## Requirements

To dispatch the service as is, you would need

* docker 0.13 installed (outside of docker-compose, node >= 7.5 is required. Using docker: Be careful, the image is big, under the hood this sets up an xserver on a framebuffer device inside the container.)
* a domain for receiving emails and the MX pointing to Mailgun
* a Mailgun.com account and email-routing / webhooks set up (target for both: HOST:PORT/addToKindle)
* the kindlegen binary for linux (in project's root folder or in path)

In it's default configuration, the program expects the following variables configured in a .env file (in project's root folder)

* MAILGUN_API_KEY (account for sending and receiving emails)
* EMAIL_DOMAIN (the domain)
* CONTACT_EMAILADDR (your email)
* SEED (some random string for deterministic crypto)

## License

This project is released under the terms of the MIT license. See [LICENSE](LICENSE) for more information.
