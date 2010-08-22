"""
Run through the socialusers API testing what's there.

Read the TESTS variable as document of
the capabilities of the API.

If you run this test file by itself, instead
of as a test it will produce a list of test
requests and some associated information.
"""

import os

from test.fixtures import make_test_env

from wsgi_intercept import httplib2_intercept
import wsgi_intercept
import httplib2
import yaml


base_url = 'http://0.0.0.0:8080'

TESTS = {}

def setup_module(module):
    global TESTS
    make_test_env(module)
    httplib2_intercept.install()
    wsgi_intercept.add_wsgi_intercept('0.0.0.0', 8080, app_fn)

    module.http = httplib2.Http()
    TESTS = yaml.load(open('../test/httptest.yaml'))

def teardown_module(module):
    os.chdir('..')

def test_assert_response():
    """
    Make sure our assertion tester is valid.
    """
    response = {
            'status': '200',
            'location': 'http://example.com',
            }
    content = 'Hello World\n'
    status = '200'
    headers = {
            'location': 'http://example.com',
            }
    expected = ['Hello']

    assert_response(response, content, status, headers, expected)

EMPTY_TEST = {
        'name': '',
        'desc': '',
        'method': 'GET',
        'url': '',
        'status': '200',
        'request_headers': {},
        'response_headers': {},
        'expected': [],
        'data': '',
        }

def test_the_TESTS():
    """
    Run the entire TEST.
    """
    for test_data in TESTS:
        test = dict(EMPTY_TEST)
        test.update(test_data)
        yield test['name'], _run_test, test

def _run_test(test):
    full_url = base_url + test['url']
    if test['method'] == 'GET' or test['method'] == 'DELETE':
        response, content = http.request(full_url, method=test['method'], headers=test['request_headers'])
    else:
        response, content = http.request(full_url, method=test['method'], headers=test['request_headers'],
                body=test['data'].encode('UTF-8'))
    assert_response(response, content, test['status'], headers=test['response_headers'], expected=test['expected'])

def assert_response(response, content, status, headers=None, expected=None):
    if response['status'] == '500': print content
    assert response['status'] == '%s' % status, (response, content)

    if headers:
        for header in headers:
            assert response[header] == headers[header]

    if expected:
        for expect in expected:
            assert expect.encode('UTF-8') in content

if __name__ == '__main__':
    for test_data in TESTS:
        test = dict(EMPTY_TEST)
        test.update(test_data)
        full_url = base_url + test['url']
        print test['name']
        print '%s %s' % (test['method'], full_url)
        print
