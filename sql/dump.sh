#!/bin/bash
# (c)copyright 2017 by Gerald Wodni <gerald.wodni@gmail.com>

# dump storage
DUMPDIR=.

# dump command, DATABASE gets substituted
COMMAND="mysqldump --defaults-file=./my.cnf \
--skip-opt \
--add-drop-table \
--add-locks \
--create-options \
--disable-keys \
--lock-tables \
--quick \
--set-charset \
\
--skip-dump-date \
--skip-comments \
--databases DATABASE \
--routines \
--events \
--skip-extended-insert \
> $DUMPDIR/DATABASE.sql"

# info extended insert disabled for simpler diffs

function performDump {
    DUMP_COMMAND=${COMMAND//DATABASE/$1};
    eval $DUMP_COMMAND;

    # Privacy: redact fullName and emails
    cat $DUMPDIR/$1.sql | \
    sed -e "s/^\(INSERT INTO \`users\` VALUES ([^']*'[^']*'.'\)[^']*','[^']*'/\1redacted-name','redacted-email'/g" \
    > $DUMPDIR/$1.public.sql
}

# do the dump
performDump 'forth-ev';

