#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset
# set -o xtrace

__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
__file="${__dir}/$(basename "${BASH_SOURCE[0]}")"
__atom_root="/atom/src"


# login_module: cas

if [ "$env_cas_enabled" = "yup" ]; then 
	sed -i "s,// 'arCasPlugin','arCasPlugin',g" /atom/src/config/ProjectConfiguration.class.php
fi

if [ "$env_cas_enabled" = "yup" ]; then 
	sed -i "s,class: myUser,class: casUser,g" /atom/src/config/factories.yml
fi

if [ "$env_cas_enabled" = "yup" ]; then 
	sed -i "s,{{cas_service_url}},$env_cas_service_url,g" /atom/src/plugins/arCasPlugin/config/app.yml
else
	sed -i "s,{{cas_service_url}},,g" /atom/src/plugins/arCasPlugin/config/app.yml
fi

if [ "$env_cas_enabled" = "yup" ]; then 
	sed -i "s,{{cas_server}},$env_cas_server,g" /atom/src/plugins/arCasPlugin/config/app.yml
else 
	sed -i "s,{{cas_server}},,g" /atom/src/plugins/arCasPlugin/config/app.yml
fi

# login_module: cas

# Clean-ups
if [ -d "/usr/local/etc/php-fpm.d" ]; then
    rm -rf /usr/local/etc/php-fpm.d/*
fi

# see about clearing the prod cache directory
if [ -n "${__atom_root}" ] && [ -d "${__atom_root}/cache/prod/${env_atom_type:-}" ]; then
	echo "Clearing cache: ${__atom_root}/cache/prod/${env_atom_type:-}"
    rm -rf "${__atom_root}/cache/prod/${env_atom_type:-}/"*
	echo "Done"
fi

# Populate configuration files
php ${__dir}/bootstrap.php $@
status=$?
if [ $status -ne 0 ]; then
    echo "bootstrap.php failed!"
    exit $status
fi

case "${env_atom_type}" in
    '')
        echo "Usage: (convenience shortcuts)"
        echo "  ./entrypoint.sh worker      Execute worker."
        echo "  ./entrypoint.sh fpm         Execute php-fpm."
        echo ""
        echo "You can also pass other commands:"
        echo "  ./entrypoint.sh bash"
        echo "  ./entrypoint.sh uptime"
        echo "  ./entrypoint.sh ls -l /"
        exit 0
        ;;
    'worker')
		echo "Start worker"
        # Give some extra time to MySQL and Gearman to start
        # and add some interval in between restarts.
        sleep 10
        php ${__dir}/../symfony jobs:worker
        exit 0
        ;;
    'fpm')
		echo "Start fpm"
        trap 'kill -INT $PID' TERM INT
        php-fpm --allow-to-run-as-root &
        PID=$!
        wait $PID
        trap - TERM INT
        wait $PID
        exit $?
        ;;
esac

exec "${@}"
