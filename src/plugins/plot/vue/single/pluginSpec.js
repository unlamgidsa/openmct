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

import {createMouseEvent, createOpenMct, resetApplicationState, spyOnBuiltins} from "utils/testing";
import PlotVuePlugin from "./plugin";
import Vue from "vue";
import StackedPlot from "../stackedPlot/StackedPlot.vue";
import configStore from "@/plugins/plot/vue/single/configuration/configStore";
import EventEmitter from "EventEmitter";

describe("the plugin", function () {
    let element;
    let child;
    let openmct;
    let telemetryPromise;
    let cleanupFirst;
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
        cleanupFirst = [];

        openmct = createOpenMct();

        let telemetryPromiseResolve;
        telemetryPromise = new Promise((resolve) => {
            telemetryPromiseResolve = resolve;
        });

        spyOn(openmct.telemetry, 'request').and.callFake(() => {
            telemetryPromiseResolve(testTelemetry);

            return telemetryPromise;
        });

        openmct.install(new PlotVuePlugin());

        element = document.createElement("div");
        element.style.width = "640px";
        element.style.height = "480px";
        child = document.createElement("div");
        child.style.width = "640px";
        child.style.height = "480px";
        element.appendChild(child);
        document.body.appendChild(element);

        openmct.time.timeSystem("utc", {
            start: 0,
            end: 4
        });

        openmct.types.addType("test-object", {
            creatable: true
        });

        spyOnBuiltins(["requestAnimationFrame"]);
        window.requestAnimationFrame.and.callFake((callBack) => {
            callBack();
        });

        openmct.on("start", done);
        openmct.startHeadless();
    });

    afterEach((done) => {
        // Needs to be in a timeout because plots use a bunch of setTimeouts, some of which can resolve during or after
        // teardown, which causes problems
        // This is hacky, we should find a better approach here.
        setTimeout(() => {
            //Cleanup code that needs to happen before dom elements start being destroyed
            cleanupFirst.forEach(cleanup => cleanup());
            cleanupFirst = [];
            document.body.removeChild(element);

            configStore.deleteAll();

            resetApplicationState(openmct).then(done);
        });
    });

    describe("the plot views", () => {

        it("provides a plot view for objects with telemetry", () => {
            const testTelemetryObject = {
                id: "test-object",
                type: "test-object",
                telemetry: {
                    values: [{
                        key: "some-key",
                        hints: {
                            domain: 1
                        }
                    },
                    {
                        key: "other-key",
                        hints: {
                            range: 1
                        }
                    }]
                }
            };

            const applicableViews = openmct.objectViews.get(testTelemetryObject, mockObjectPath);
            let plotView = applicableViews.find((viewProvider) => viewProvider.key === "plot-simple");
            expect(plotView).toBeDefined();
        });

        it("provides an overlay plot view for objects with telemetry", () => {
            const testTelemetryObject = {
                id: "test-object",
                type: "telemetry.plot.overlay",
                telemetry: {
                    values: [{
                        key: "some-key"
                    }]
                }
            };

            const applicableViews = openmct.objectViews.get(testTelemetryObject, mockObjectPath);
            let plotView = applicableViews.find((viewProvider) => viewProvider.key === "plot-overlay");
            expect(plotView).toBeDefined();
        });

        it("provides a stacked plot view for objects with telemetry", () => {
            const testTelemetryObject = {
                id: "test-object",
                type: "telemetry.plot.stacked",
                telemetry: {
                    values: [{
                        key: "some-key"
                    }]
                }
            };

            const applicableViews = openmct.objectViews.get(testTelemetryObject, mockObjectPath);
            let plotView = applicableViews.find((viewProvider) => viewProvider.key === "plot-stacked");
            expect(plotView).toBeDefined();
        });
    });

    describe("The single plot view", () => {
        let testTelemetryObject;
        let applicableViews;
        let plotViewProvider;
        let plotView;

        beforeEach(() => {
            const getFunc = openmct.$injector.get;
            spyOn(openmct.$injector, "get")
                .withArgs("exportImageService").and.returnValue({
                    exportPNG: () => {},
                    exportJPG: () => {}
                })
                .and.callFake(getFunc);

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
                }
            };

            applicableViews = openmct.objectViews.get(testTelemetryObject, mockObjectPath);
            plotViewProvider = applicableViews.find((viewProvider) => viewProvider.key === "plot-simple");
            plotView = plotViewProvider.view(testTelemetryObject, [testTelemetryObject]);
            plotView.show(child, true);

            cleanupFirst.push(() => {
                plotView.destroy();
            });

            return Vue.nextTick();
        });

        it("Renders a collapsed legend for every telemetry", () => {
            let legend = element.querySelectorAll(".plot-wrapper-collapsed-legend .plot-series-name");
            expect(legend.length).toBe(1);
            expect(legend[0].innerHTML).toEqual("Test Object");
        });

        it("Renders an expanded legend for every telemetry", () => {
            let legendControl = element.querySelector(".c-plot-legend__view-control.gl-plot-legend__view-control.c-disclosure-triangle");
            const clickEvent = createMouseEvent("click");

            legendControl.dispatchEvent(clickEvent);

            let legend = element.querySelectorAll(".plot-wrapper-expanded-legend .plot-legend-item td");
            expect(legend.length).toBe(6);
        });

        it("Renders X-axis ticks for the telemetry object", () => {
            let xAxisElement = element.querySelectorAll(".gl-plot-axis-area.gl-plot-x .gl-plot-tick-wrapper");
            expect(xAxisElement.length).toBe(1);

            let ticks = xAxisElement[0].querySelectorAll(".gl-plot-tick");
            expect(ticks.length).toBe(5);
        });

        it("Renders Y-axis options for the telemetry object", () => {
            let yAxisElement = element.querySelectorAll(".gl-plot-axis-area.gl-plot-y .gl-plot-y-label__select");
            expect(yAxisElement.length).toBe(1);
            //Object{name: "Some attribute", key: "some-key"}, Object{name: "Another attribute", key: "some-other-key"}
            let options = yAxisElement[0].querySelectorAll("option");
            expect(options.length).toBe(2);
            expect(options[0].value).toBe("Some attribute");
            expect(options[1].value).toBe("Another attribute");
        });
    });

    describe("The stacked plot view", () => {
        let testTelemetryObject;
        let testTelemetryObject2;
        let config;
        let stackedPlotObject;
        let component;
        let mockComposition;
        let plotViewComponentObject;

        beforeEach(() => {
            const getFunc = openmct.$injector.get;
            spyOn(openmct.$injector, "get")
                .withArgs("exportImageService").and.returnValue({
                    exportPNG: () => {},
                    exportJPG: () => {}
                })
                .and.callFake(getFunc);

            stackedPlotObject = {
                identifier: {
                    namespace: "",
                    key: "test-plot"
                },
                type: "telemetry.plot.stacked",
                name: "Test Stacked Plot"
            };

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
                }
            };

            testTelemetryObject2 = {
                identifier: {
                    namespace: "",
                    key: "test-object2"
                },
                type: "test-object",
                name: "Test Object2",
                telemetry: {
                    values: [{
                        key: "utc",
                        format: "utc",
                        name: "Time",
                        hints: {
                            domain: 1
                        }
                    }, {
                        key: "some-key2",
                        name: "Some attribute2",
                        hints: {
                            range: 1
                        }
                    }, {
                        key: "some-other-key2",
                        name: "Another attribute2",
                        hints: {
                            range: 2
                        }
                    }]
                }
            };

            mockComposition = new EventEmitter();
            mockComposition.load = () => {
                mockComposition.emit('add', testTelemetryObject);

                return [testTelemetryObject];
            };

            spyOn(openmct.composition, 'get').and.returnValue(mockComposition);

            let viewContainer = document.createElement("div");
            child.append(viewContainer);
            component = new Vue({
                el: viewContainer,
                components: {
                    StackedPlot
                },
                provide: {
                    openmct: openmct,
                    domainObject: stackedPlotObject,
                    composition: openmct.composition.get(stackedPlotObject)
                },
                template: "<stacked-plot></stacked-plot>"
            });

            cleanupFirst.push(() => {
                component.$destroy();
                component = undefined;
            });

            return telemetryPromise
                .then(Vue.nextTick())
                .then(() => {
                    plotViewComponentObject = component.$root.$children[0];
                    const configId = openmct.objects.makeKeyString(testTelemetryObject.identifier);
                    config = configStore.get(configId);
                });
        });

        it("Renders a collapsed legend for every telemetry", () => {
            let legend = element.querySelectorAll(".plot-wrapper-collapsed-legend .plot-series-name");
            expect(legend.length).toBe(1);
            expect(legend[0].innerHTML).toEqual("Test Object");
        });

        it("Renders an expanded legend for every telemetry", () => {
            let legendControl = element.querySelector(".c-plot-legend__view-control.gl-plot-legend__view-control.c-disclosure-triangle");
            const clickEvent = createMouseEvent("click");

            legendControl.dispatchEvent(clickEvent);

            let legend = element.querySelectorAll(".plot-wrapper-expanded-legend .plot-legend-item td");
            expect(legend.length).toBe(6);
        });

        it("Renders X-axis ticks for the telemetry object", () => {
            let xAxisElement = element.querySelectorAll(".gl-plot-axis-area.gl-plot-x .gl-plot-tick-wrapper");
            expect(xAxisElement.length).toBe(1);

            let ticks = xAxisElement[0].querySelectorAll(".gl-plot-tick");
            expect(ticks.length).toBe(5);
        });

        it("Renders Y-axis ticks for the telemetry object", (done) => {
            config.yAxis.set('displayRange', {
                min: 10,
                max: 20
            });
            Vue.nextTick(() => {
                let yAxisElement = element.querySelectorAll(".gl-plot-axis-area.gl-plot-y .gl-plot-tick-wrapper");
                expect(yAxisElement.length).toBe(1);
                let ticks = yAxisElement[0].querySelectorAll(".gl-plot-tick");
                expect(ticks.length).toBe(6);
                done();
            });
        });

        it("Renders Y-axis options for the telemetry object", () => {
            let yAxisElement = element.querySelectorAll(".gl-plot-axis-area.gl-plot-y .gl-plot-y-label__select");
            expect(yAxisElement.length).toBe(1);
            let options = yAxisElement[0].querySelectorAll("option");
            expect(options.length).toBe(2);
            expect(options[0].value).toBe("Some attribute");
            expect(options[1].value).toBe("Another attribute");
        });

        it("turns on cursor Guides all telemetry objects", (done) => {
            expect(plotViewComponentObject.cursorGuide).toBeFalse();
            plotViewComponentObject.toggleCursorGuide();
            Vue.nextTick(() => {
                expect(plotViewComponentObject.$children[0].component.$children[0].cursorGuide).toBeTrue();
                done();
            });
        });

        it("shows grid lines for all telemetry objects", () => {
            expect(plotViewComponentObject.gridLines).toBeTrue();
            let gridLinesContainer = element.querySelectorAll(".gl-plot-display-area .js-ticks");
            let visible = 0;
            gridLinesContainer.forEach(el => {
                if (el.style.display !== "none") {
                    visible++;
                }
            });
            expect(visible).toBe(2);
        });

        it("hides grid lines for all telemetry objects", (done) => {
            expect(plotViewComponentObject.gridLines).toBeTrue();
            plotViewComponentObject.toggleGridLines();
            Vue.nextTick(() => {
                expect(plotViewComponentObject.gridLines).toBeFalse();
                let gridLinesContainer = element.querySelectorAll(".gl-plot-display-area .js-ticks");
                let visible = 0;
                gridLinesContainer.forEach(el => {
                    if (el.style.display !== "none") {
                        visible++;
                    }
                });
                expect(visible).toBe(0);
                done();
            });
        });

        it('plots a new series when a new telemetry object is added', (done) => {
            mockComposition.emit('add', testTelemetryObject2);
            Vue.nextTick(() => {
                let legend = element.querySelectorAll(".plot-wrapper-collapsed-legend .plot-series-name");
                expect(legend.length).toBe(2);
                expect(legend[1].innerHTML).toEqual("Test Object2");
                done();
            });
        });

        it('removes plots from series when a telemetry object is removed', (done) => {
            mockComposition.emit('remove', testTelemetryObject.identifier);
            Vue.nextTick(() => {
                let legend = element.querySelectorAll(".plot-wrapper-collapsed-legend .plot-series-name");
                expect(legend.length).toBe(0);
                done();
            });
        });

        it("Changes the label of the y axis when the option changes", (done) => {
            let selectEl = element.querySelector('.gl-plot-y-label__select');
            selectEl.value = 'Another attribute';
            selectEl.dispatchEvent(new Event("change"));

            Vue.nextTick(() => {
                expect(config.yAxis.get('label')).toEqual('Another attribute');
                done();
            });
        });

        it("Renders a new series when added to one of the plots", (done) => {
            mockComposition.emit('add', testTelemetryObject2);
            Vue.nextTick(() => {
                let legend = element.querySelectorAll(".plot-wrapper-collapsed-legend .plot-series-name");
                expect(legend.length).toBe(2);
                expect(legend[1].innerHTML).toEqual("Test Object2");
                done();
            });
        });

        it("Adds a new point to the plot", (done) => {
            let originalLength = config.series.models[0].data.length;
            config.series.models[0].add({
                utc: 2,
                'some-key': 1,
                'some-other-key': 2
            });
            Vue.nextTick(() => {
                expect(config.series.models[0].data.length).toEqual(originalLength + 1);
                done();
            });
        });

        it("updates the xscale", (done) => {
            config.xAxis.set('displayRange', {
                min: 0,
                max: 10
            });
            Vue.nextTick(() => {
                expect(plotViewComponentObject.$children[0].component.$children[0].xScale.domain()).toEqual({
                    min: 0,
                    max: 10
                });
                done();
            });
        });

        it("updates the yscale", (done) => {
            config.yAxis.set('displayRange', {
                min: 10,
                max: 20
            });
            Vue.nextTick(() => {
                expect(plotViewComponentObject.$children[0].component.$children[0].yScale.domain()).toEqual({
                    min: 10,
                    max: 20
                });
                done();
            });
        });
    });

});
