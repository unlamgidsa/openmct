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

import {createOpenMct, resetApplicationState} from "utils/testing";
import Vue from "vue";
import BarGraphPlugin from "./plugin";
import BarGraph from './BarGraphPlot.vue';
import EventEmitter from "EventEmitter";
import { BAR_GRAPH_VIEW, BAR_GRAPH_KEY } from './BarGraphConstants';

describe("the plugin", function () {
    let element;
    let child;
    let openmct;
    let telemetryPromise;
    let telemetryPromiseResolve;
    let mockObjectPath;

    beforeEach((done) => {
        mockObjectPath = [
            {
                name: 'mock folder',
                type: 'fake-folder',
                identifier: {
                    key: 'mock-folder',
                    namespace: ''
                }
            },
            {
                name: 'mock parent folder',
                type: 'time-strip',
                identifier: {
                    key: 'mock-parent-folder',
                    namespace: ''
                }
            }
        ];
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

        openmct = createOpenMct();

        telemetryPromise = new Promise((resolve) => {
            telemetryPromiseResolve = resolve;
        });

        spyOn(openmct.telemetry, 'request').and.callFake(() => {
            telemetryPromiseResolve(testTelemetry);

            return telemetryPromise;
        });

        openmct.install(new BarGraphPlugin());

        element = document.createElement("div");
        element.style.width = "640px";
        element.style.height = "480px";
        child = document.createElement("div");
        child.style.width = "640px";
        child.style.height = "480px";
        element.appendChild(child);
        document.body.appendChild(element);

        spyOn(window, 'ResizeObserver').and.returnValue({
            observe() {},
            unobserve() {},
            disconnect() {}
        });

        openmct.time.timeSystem("utc", {
            start: 0,
            end: 4
        });

        openmct.types.addType("test-object", {
            creatable: true
        });

        openmct.on("start", done);
        openmct.startHeadless();
    });

    afterEach((done) => {
        openmct.time.timeSystem('utc', {
            start: 0,
            end: 1
        });
        resetApplicationState(openmct).then(done).catch(done);
    });

    describe("The bar graph view", () => {
        let testDomainObject;
        let barGraphObject;
        // eslint-disable-next-line no-unused-vars
        let component;
        let mockComposition;

        beforeEach(async () => {
            const getFunc = openmct.$injector.get;
            spyOn(openmct.$injector, "get")
                .withArgs("exportImageService").and.returnValue({
                    exportPNG: () => {},
                    exportJPG: () => {}
                })
                .and.callFake(getFunc);

            barGraphObject = {
                identifier: {
                    namespace: "",
                    key: "test-plot"
                },
                type: "telemetry.plot.bar-graph",
                name: "Test Bar Graph"
            };

            testDomainObject = {
                identifier: {
                    namespace: "",
                    key: "test-object"
                },
                configuration: {
                    barStyles: {
                        series: {}
                    }
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
                }
            };

            mockComposition = new EventEmitter();
            mockComposition.load = () => {
                mockComposition.emit('add', testDomainObject);

                return [testDomainObject];
            };

            spyOn(openmct.composition, 'get').and.returnValue(mockComposition);

            let viewContainer = document.createElement("div");
            child.append(viewContainer);
            component = new Vue({
                el: viewContainer,
                components: {
                    BarGraph
                },
                provide: {
                    openmct: openmct,
                    domainObject: barGraphObject,
                    composition: openmct.composition.get(barGraphObject)
                },
                template: "<BarGraph></BarGraph>"
            });

            await Vue.nextTick();
        });

        it("provides a bar graph view", () => {
            const applicableViews = openmct.objectViews.get(barGraphObject, mockObjectPath);
            const plotViewProvider = applicableViews.find((viewProvider) => viewProvider.key === BAR_GRAPH_VIEW);
            expect(plotViewProvider).toBeDefined();
        });

        it("Renders plotly bar graph", () => {
            let barChartElement = element.querySelectorAll(".plotly");
            expect(barChartElement.length).toBe(1);
        });

        it("Handles dots in telemetry id", () => {
            const dotFullTelemetryObject = {
                identifier: {
                    namespace: "someNamespace",
                    key: "~OpenMCT~outer.test-object.foo.bar"
                },
                type: "test-dotful-object",
                name: "A Dotful Object",
                telemetry: {
                    values: [{
                        key: "utc",
                        format: "utc",
                        name: "Time",
                        hints: {
                            domain: 1
                        }
                    }, {
                        key: "some-key.foo.name.45",
                        name: "Some dotful attribute",
                        hints: {
                            range: 1
                        }
                    }, {
                        key: "some-other-key.bar.344.rad",
                        name: "Another dotful attribute",
                        hints: {
                            range: 2
                        }
                    }]
                }
            };

            const applicableViews = openmct.objectViews.get(barGraphObject, mockObjectPath);
            const plotViewProvider = applicableViews.find((viewProvider) => viewProvider.key === BAR_GRAPH_VIEW);
            const barGraphView = plotViewProvider.view(testDomainObject, [testDomainObject]);
            barGraphView.show(child, true);
            expect(testDomainObject.configuration.barStyles.series["test-object"].name).toEqual("Test Object");
            mockComposition.emit('add', dotFullTelemetryObject);
            expect(testDomainObject.configuration.barStyles.series["someNamespace:~OpenMCT~outer.test-object.foo.bar"].name).toEqual("A Dotful Object");
            barGraphView.destroy();
        });
    });

    describe("the bar graph objects", () => {
        const mockObject = {
            name: 'A very nice bar graph',
            key: BAR_GRAPH_KEY,
            creatable: true
        };

        it('defines a bar graph object type with the correct key', () => {
            const objectDef = openmct.types.get(BAR_GRAPH_KEY).definition;
            expect(objectDef.key).toEqual(mockObject.key);
        });

        it('is creatable', () => {
            const objectDef = openmct.types.get(BAR_GRAPH_KEY).definition;
            expect(objectDef.creatable).toEqual(mockObject.creatable);
        });
    });

    describe("The bar graph composition policy", () => {

        it("allows composition for telemetry that contain at least one range", () => {
            const parent = {
                "composition": [],
                "configuration": {},
                "name": "Some Bar Graph",
                "type": "telemetry.plot.bar-graph",
                "location": "mine",
                "modified": 1631005183584,
                "persisted": 1631005183502,
                "identifier": {
                    "namespace": "",
                    "key": "b78e7e23-f2b8-4776-b1f0-3ff778f5c8a9"
                }
            };
            const testTelemetryObject = {
                identifier: {
                    namespace: "",
                    key: "test-object"
                },
                type: "test-object",
                name: "Test Object",
                telemetry: {
                    values: [{
                        key: "some-key",
                        name: "Some attribute",
                        hints: {
                            domain: 1
                        }
                    }, {
                        key: "some-other-key",
                        name: "Another attribute",
                        hints: {
                            range: 1
                        }
                    }]
                }
            };
            const composition = openmct.composition.get(parent);
            expect(() => {
                composition.add(testTelemetryObject);
            }).not.toThrow();
            expect(parent.composition.length).toBe(1);
        });

        it("disallows composition for telemetry that don't contain any range hints", () => {
            const parent = {
                "composition": [],
                "configuration": {},
                "name": "Some Bar Graph",
                "type": "telemetry.plot.bar-graph",
                "location": "mine",
                "modified": 1631005183584,
                "persisted": 1631005183502,
                "identifier": {
                    "namespace": "",
                    "key": "b78e7e23-f2b8-4776-b1f0-3ff778f5c8a9"
                }
            };
            const testTelemetryObject = {
                identifier: {
                    namespace: "",
                    key: "test-object"
                },
                type: "test-object",
                name: "Test Object",
                telemetry: {
                    values: [{
                        key: "some-key",
                        name: "Some attribute"
                    }, {
                        key: "some-other-key",
                        name: "Another attribute"
                    }]
                }
            };
            const composition = openmct.composition.get(parent);
            expect(() => {
                composition.add(testTelemetryObject);
            }).toThrow();
            expect(parent.composition.length).toBe(0);
        });
    });
    describe('the inspector view', () => {
        let mockComposition;
        let testDomainObject;
        let selection;
        let plotInspectorView;
        let viewContainer;
        let optionsElement;
        beforeEach(async () => {
            testDomainObject = {
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
                }
            };

            selection = [
                [
                    {
                        context: {
                            item: {
                                id: "test-object",
                                identifier: {
                                    key: "test-object",
                                    namespace: ''
                                },
                                type: "telemetry.plot.bar-graph",
                                configuration: {
                                    barStyles: {
                                        series: {
                                            '~Some~foo.bar': {
                                                name: 'A telemetry object',
                                                type: 'some-type',
                                                isAlias: true
                                            }
                                        }
                                    }
                                },
                                composition: [
                                    {
                                        key: '~Some~foo.bar'
                                    }
                                ]
                            }
                        }
                    },
                    {
                        context: {
                            item: {
                                type: 'time-strip',
                                identifier: {
                                    key: 'some-other-key',
                                    namespace: ''
                                }
                            }
                        }
                    }
                ]
            ];

            mockComposition = new EventEmitter();
            mockComposition.load = () => {
                mockComposition.emit('add', testDomainObject);

                return [testDomainObject];
            };

            spyOn(openmct.composition, 'get').and.returnValue(mockComposition);

            viewContainer = document.createElement('div');
            child.append(viewContainer);

            const applicableViews = openmct.inspectorViews.get(selection);
            plotInspectorView = applicableViews[0];
            plotInspectorView.show(viewContainer);

            await Vue.nextTick();
            optionsElement = element.querySelector('.c-bar-graph-options');
        });

        afterEach(() => {
            plotInspectorView.destroy();
        });

        it('it renders the options', () => {
            expect(optionsElement).toBeDefined();
        });

        it('shows the name', () => {
            const seriesEl = optionsElement.querySelector('.c-object-label__name');
            expect(seriesEl.innerHTML).toEqual('A telemetry object');
        });
    });
});
