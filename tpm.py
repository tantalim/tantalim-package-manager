#!/usr/bin/env python

import urllib2
import json

registry_hub = "https://raw.githubusercontent.com/tantalim/tantalim-hub/master/index.json"


def get_registry_index():
    registry_json = urllib2.urlopen(registry_hub, timeout=10).read()
    registry = json.loads(registry_json)[u'registry']
    print registry

if __name__ == '__main__':
    get_registry_index()
