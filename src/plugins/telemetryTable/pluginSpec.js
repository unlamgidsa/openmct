/*****************************************************************************
 * Open MCT, Copyright (c) 2014-2021, United States Government
 * as represented by the Administrator of the National Aeronautics and Space
 * Administration. All rights reserved.
 *
 * Open MCT is licensed under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * Open MCT includes source code licensed under additional open source
 * licenses. See the Open Source Licenses file (LICENSES.md) included with
 * this source code distribution or the Licensing information page available
 * at runtime from the About dialog for additional information.
 *****************************************************************************/
import TablePlugin from './plugin.js';
import Vue from 'vue';
import {
    createOpenMct,
    createMouseEvent,
    spyOnBuiltins,
    resetApplicationState
} from 'utils/testing';

class MockDataTransfer {
    constructor() {
        this.data = {};
    }
    get types() {
        return Object.keys(this.data);
    }
    setData(format, data) {
        this.data[format] = data;
    }
    getData(format) {
        return this.data[format];
    }
}

describe("the plugin", () => {
    let openmct;
    let tablePlugin;
    let element;
    let child;
    let historicalProvider;
    let originalRouterPath;
    let unlistenConfigMutation;

    beforeEach((done) => {
        openmct = createOpenMct();

        // Table Plugin is actually installed by default, but because installing it
        // again is harmless it is left here as an examplar for non-default plugins.
        tablePlugin = new TablePlugin();
        openmct.install(tablePlugin);

        historicalProvider = {
            request: () => {
                return Promise.resolve([]);
            }
        };
        spyOn(openmct.telemetry, 'findRequestProvider').and.returnValue(historicalProvider);

        element = document.createElement('div');
        child = document.createElement('div');
        element.appendChild(child);

        openmct.time.timeSystem('utc', {
            start: 0,
            end: 4
        });

        openmct.types.addType('test-object', {
            creatable: true
        });

        spyOnBuiltins(['requestAnimationFrame']);
        window.requestAnimationFrame.and.callFake((callBack) => {
            callBack();
        });

        originalRouterPath = openmct.router.path;

        openmct.on('start', done);
        openmct.startHeadless();
    });

    afterEach(() => {
        openmct.time.timeSystem('utc', {
            start: 0,
            end: 1
        });

        if (unlistenConfigMutation) {
            unlistenConfigMutation();
        }

        return resetApplicationState(openmct);
    });

    describe("defines a table object", function () {
        it("that is creatable", () => {
            let tableType = openmct.types.get('table');
            expect(tableType.definition.creatable).toBe(true);
        });
    });

    it("provides a table view for objects with telemetry", () => {
        const testTelemetryObject = {
            id: "test-object",
            type: "test-object",
            telemetry: {
                values: [{
                    key: "some-key"
                }]
            }
        };

        const applicableViews = openmct.objectViews.get(testTelemetryObject, []);
        let tableView = applicableViews.find((viewProvider) => viewProvider.key === 'table');
        expect(tableView).toBeDefined();
    });

    describe("The table view", () => {
        let testTelemetryObject;
        let applicableViews;
        let tableViewProvider;
        let tableView;
        let tableInstance;

        beforeEach(() => {
            openmct.time.timeSystem('utc', {
                start: 0,
                end: 4
            });

            testTelemetryObject = {
                identifier: {
                    namespace: "",
                    key: "test-object"
                },
                type: "test-object",
                name: "Test Object",
                telemetry: {
                    values: [{
                        key: "utc",
                        format: "utc",
                        name: "Time",
                        hints: {
                            domain: 1
                        }
                    }, {
                        key: "some-key",
                        name: "Some attribute",
                        hints: {
                            range: 1
                        }
                    }, {
                        key: "some-other-key",
                        name: "Another attribute",
                        hints: {
                            range: 2
                        }
                    }]
                },
                configuration: {
                    hiddenColumns: {
                        name: false,
                        utc: false,
                        'some-key': false,
                        'some-other-key': false
                    }
                }
            };
            const testTelemetry = [
                {
                    'utc': 1,
                    'some-key': 'some-value 1',
                    'some-other-key': 'some-other-value 1'
                },
                {
                    'utc': 2,
                    'some-key': 'some-value 2',
                    'some-other-key': 'some-other-value 2'
                },
                {
                    'utc': 3,
                    'some-key': 'some-value 3',
                    'some-other-key': 'some-other-value 3'
                }
            ];
            let telemetryPromiseResolve;
            let telemetryPromise = new Promise((resolve) => {
                telemetryPromiseResolve = resolve;
            });

            historicalProvider.request = () => {
                telemetryPromiseResolve(testTelemetry);

                return telemetryPromise;
            };

            openmct.router.path = [testTelemetryObject];

            applicableViews = openmct.objectViews.get(testTelemetryObject, []);
            tableViewProvider = applicableViews.find((viewProvider) => viewProvider.key === 'table');
            tableView = tableViewProvider.view(testTelemetryObject, [testTelemetryObject]);
            tableView.show(child, true);

            tableInstance = tableView.getTable();

            return telemetryPromise.then(() => Vue.nextTick());
        });

        afterEach(() => {
            openmct.router.path = originalRouterPath;
        });

        it("Shows no progress bar initially", () => {
            let progressBar = element.querySelector('.c-progress-bar');

            expect(tableInstance.outstandingRequests).toBe(0);
            expect(progressBar).toBeNull();
        });

        it("Shows a progress bar while making requests", async () => {
            tableInstance.incrementOutstandingRequests();
            await Vue.nextTick();

            let progressBar = element.querySelector('.c-progress-bar');

            expect(tableInstance.outstandingRequests).toBe(1);
            expect(progressBar).not.toBeNull();

        });

        it("Renders a row for every telemetry datum returned", (done) => {
            let rows = element.querySelectorAll('table.c-telemetry-table__body tr');
            Vue.nextTick(() => {
                expect(rows.length).toBe(3);

                done();
            });
        });

        it("Renders a column for every item in telemetry metadata", () => {
            let headers = element.querySelectorAll('span.c-telemetry-table__headers__label');
            expect(headers.length).toBe(4);
            expect(headers[0].innerText).toBe('Name');
            expect(headers[1].innerText).toBe('Time');
            expect(headers[2].innerText).toBe('Some attribute');
            expect(headers[3].innerText).toBe('Another attribute');
        });

        it("Supports column reordering via drag and drop", () => {
            let columns = element.querySelectorAll('tr.c-telemetry-table__headers__labels th');
            let fromColumn = columns[0];
            let toColumn = columns[1];
            let fromColumnText = fromColumn.querySelector('span.c-telemetry-table__headers__label').innerText;
            let toColumnText = toColumn.querySelector('span.c-telemetry-table__headers__label').innerText;

            let dragStartEvent = createMouseEvent('dragstart');
            let dragOverEvent = createMouseEvent('dragover');
            let dropEvent = createMouseEvent('drop');

            dragStartEvent.dataTransfer =
                dragOverEvent.dataTransfer =
                    dropEvent.dataTransfer = new MockDataTransfer();

            fromColumn.dispatchEvent(dragStartEvent);
            toColumn.dispatchEvent(dragOverEvent);
            toColumn.dispatchEvent(dropEvent);

            return Vue.nextTick().then(() => {
                columns = element.querySelectorAll('tr.c-telemetry-table__headers__labels th');
                let firstColumn = columns[0];
                let secondColumn = columns[1];
                let firstColumnText = firstColumn.querySelector('span.c-telemetry-table__headers__label').innerText;
                let secondColumnText = secondColumn.querySelector('span.c-telemetry-table__headers__label').innerText;

                expect(fromColumnText).not.toEqual(firstColumnText);
                expect(fromColumnText).toEqual(secondColumnText);
                expect(toColumnText).not.toEqual(secondColumnText);
                expect(toColumnText).toEqual(firstColumnText);
            });
        });

        it("Supports filtering telemetry by regular text search", () => {
            tableInstance.tableRows.setColumnFilter("some-key", "1");

            return Vue.nextTick().then(() => {
                let filteredRowElements = element.querySelectorAll('table.c-telemetry-table__body tr');

                expect(filteredRowElements.length).toEqual(1);

                tableInstance.tableRows.setColumnFilter("some-key", "");

                return Vue.nextTick().then(() => {
                    let allRowElements = element.querySelectorAll('table.c-telemetry-table__body tr');

                    expect(allRowElements.length).toEqual(3);
                });
            });
        });

        it("Supports filtering using Regex", () => {
            tableInstance.tableRows.setColumnRegexFilter("some-key", "^some-value$");

            return Vue.nextTick().then(() => {
                let filteredRowElements = element.querySelectorAll('table.c-telemetry-table__body tr');

                expect(filteredRowElements.length).toEqual(0);

                tableInstance.tableRows.setColumnRegexFilter("some-key", "^some-value");

                return Vue.nextTick().then(() => {
                    let allRowElements = element.querySelectorAll('table.c-telemetry-table__body tr');

                    expect(allRowElements.length).toEqual(3);
                });
            });
        });

        it("displays the correct number of column headers when the configuration is mutated", async () => {
            const tableInstanceConfiguration = tableInstance.domainObject.configuration;
            tableInstanceConfiguration.hiddenColumns['some-key'] = true;
            unlistenConfigMutation = tableInstance.openmct.objects.mutate(tableInstance.domainObject, 'configuration', tableInstanceConfiguration);

            await Vue.nextTick();
            let tableHeaderElements = element.querySelectorAll('.c-telemetry-table__headers__label');
            expect(tableHeaderElements.length).toEqual(3);

            tableInstanceConfiguration.hiddenColumns['some-key'] = false;
            unlistenConfigMutation = tableInstance.openmct.objects.mutate(tableInstance.domainObject, 'configuration', tableInstanceConfiguration);

            await Vue.nextTick();
            tableHeaderElements = element.querySelectorAll('.c-telemetry-table__headers__label');
            expect(tableHeaderElements.length).toEqual(4);
        });

        it("displays the correct number of table cells in a row when the configuration is mutated", async () => {
            const tableInstanceConfiguration = tableInstance.domainObject.configuration;
            tableInstanceConfiguration.hiddenColumns['some-key'] = true;
            unlistenConfigMutation = tableInstance.openmct.objects.mutate(tableInstance.domainObject, 'configuration', tableInstanceConfiguration);

            await Vue.nextTick();
            let tableRowCells = element.querySelectorAll('table.c-telemetry-table__body > tbody > tr:first-child td');
            expect(tableRowCells.length).toEqual(3);

            tableInstanceConfiguration.hiddenColumns['some-key'] = false;
            unlistenConfigMutation = tableInstance.openmct.objects.mutate(tableInstance.domainObject, 'configuration', tableInstanceConfiguration);

            await Vue.nextTick();
            tableRowCells = element.querySelectorAll('table.c-telemetry-table__body > tbody > tr:first-child td');
            expect(tableRowCells.length).toEqual(4);
        });
    });
});
