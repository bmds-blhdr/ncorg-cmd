# A simple command line tool for interacting with neocities

This tool is written in ES 2017, it requires at least **node.js 8** to run without transpilation.

| command | action                                                       |
|---------|--------------------------------------------------------------|
| help    | print help                                                   |
| status  | information about your website                               |
| list    | list all remote files                                        |
| push    | synchronize your website with the folder given as an agument |

You can invoke it directly or with `npm run ncorg-cmd` if you use npm.
Credentials are passed as environment variables,
`NEOCITIES_USER` for the username,
`NEOCITIES_PASS` for the password.

It also exports a class to be used programatically.
Its constructor takes an object with the keys `username` and `password`.
It exposes `status`, `list` and `push` as async methods,
as well as a `process_cmd` async method that takes a command name and an optionnal argument
(only used by `push` to know wich directory to synchronize).

# Example

Supposing the folder `public` contains your static website:
```sh
NEOCITIES_USER="yourname" NEOCITIES_PASS="yourpassword" ./ncorg-cmd push public
```

# TODO

 - automated tests
 - a `clean` command that removes all files and replaces `index.html` with an empty file
 - pass options to `push` for `glob`
 - a command to delete one or more files
