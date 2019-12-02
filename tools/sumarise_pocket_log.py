#!/usr/bin/env python3

from collections import defaultdict
from datetime import timedelta, datetime, date

import csv
import fileinput
import pytz
import sys

uk_timezone = pytz.timezone('Europe/London')
iso_format = '%Y-%m-%d %H:%M:%S'


def truncate_to_bin(date):
    '''
    Round date down to Sunday
    '''
    days_since_sunday = (date.weekday()+1)%7
    return date - timedelta(days=days_since_sunday)


def read_data():

    this_weeks_bin = truncate_to_bin(date.today())

    results = []
    current_bin = None
    active = 0
    inactive = 0
    last_seen = {}

    for line in fileinput.input():

        record_timestamp = uk_timezone.localize(datetime.strptime(line[1:20], iso_format))
        record_date = record_timestamp.date()
        client = line.split('|')[3]

        bin = truncate_to_bin(record_date)
        # Ignore the partial bin for the current week
        if bin >= this_weeks_bin:
            continue

        # If we've crossed a bin boundary
        if current_bin != bin:
            if current_bin:
                results.append([current_bin, active, inactive, len(last_seen)])
            seen = set()
            current_bin = bin
            active = 0
            inactive = 0

        # Process first hit for each client in each bin
        if client not in seen:
            seen.add(client)

            if client in last_seen and last_seen[client] >= record_date - timedelta(days=30):
                active += 1
            else:
                inactive += 1

        # Record seeing this client on this day
        last_seen[client] = record_date

    # Flush counts for the current bin
    if current_bin:
        results.append([current_bin, active, inactive, len(last_seen)])

    return results


def save_data():
    writer = csv.writer(sys.stdout)
    writer.writerow(['Date', 'Active', 'Inactive', 'Total'])
    writer.writerows(read_data())


def run():
    save_data()


if __name__ == '__main__':
    run()
