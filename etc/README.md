# /etc/cite-server.conf

Use this file to start `cite-server` via upstart.

Customize to your system by editing the file. The variables of note
are:

```bash
export USER=congress-api
export GROUP=www-data
export HOME=/projects/$USER
export NODE_PATH=/usr/local/bin
export APP_NAME=cite-server
export APP_PATH=$HOME/unitedstates/citation
export APP_EXEC=$APP_PATH/bin/$APP_NAME # not used
```

Most of these are self explanatory and document themselves. Yup, document
themselves, job done.

-- [@timball](https://github.com/timball)