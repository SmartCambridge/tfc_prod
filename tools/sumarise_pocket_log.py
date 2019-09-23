#!/usr/bin/env python3

from collections import defaultdict
from datetime import timedelta, datetime

import csv
import fileinput
import pytz
import sys

uk_timezone = pytz.timezone('Europe/London')
iso_format = '%Y-%m-%d %H:%M:%S'


def truncate_to_bin(date):
    '''
    Round date down to bin start date
    '''

    return date - timedelta(days=date.weekday())


def read_data():

    results = []
    current_bin = None
    active = 0
    inactive = 0
    last_seen = {}

    for line in fileinput.input():

        timestamp = uk_timezone.localize(datetime.strptime(line[1:20], iso_format))
        date = timestamp.date()
        client = line.split('|')[3]

        bin = truncate_to_bin(date)

        # If we've crossed a bin boundary
        if current_bin != bin:
            if current_bin:
                results.append([current_bin, active, inactive])
            seen = set()
            current_bin = bin
            active = 0
            inactive = 0

        # Process first hit for each client in each bin
        if client not in seen:
            seen.add(client)

            if client in last_seen and last_seen[client] >= date - timedelta(days=30):
                active += 1
            else:
                inactive += 1

        # Record seeing this client on this day
        last_seen[client] = date

    # Explicitly ignore the 'in-process' bin at the end of the file
    # because it (almost certainly) contains data for a partial period

    return results


def save_data():
    writer = csv.writer(sys.stdout)
    writer.writerow(['Date', 'Active', 'Inactive'])
    writer.writerows(read_data())


def run():
    save_data()


if __name__ == '__main__':
    run()
