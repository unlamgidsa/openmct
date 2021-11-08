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

import Vue from 'vue';
import {
    createMouseEvent,
    createOpenMct,
    resetApplicationState,
    simulateKeyEvent
} from 'utils/testing';

const ONE_MINUTE = 1000 * 60;
const TEN_MINUTES = ONE_MINUTE * 10;
const MAIN_IMAGE_CLASS = '.js-imageryView-image';
const NEW_IMAGE_CLASS = '.c-imagery__age.c-imagery--new';
const REFRESH_CSS_MS = 500;

function getImageInfo(doc) {
    let imageElement = doc.querySelectorAll(MAIN_IMAGE_CLASS)[0];
    let timestamp = imageElement.dataset.openmctImageTimestamp;
    let identifier = imageElement.dataset.openmctObjectKeystring;
    let url = imageElement.src;

    return {
        timestamp,
        identifier,
        url
    };
}

function isNew(doc) {
    let newIcon = doc.querySelectorAll(NEW_IMAGE_CLASS);

    return newIcon.length !== 0;
}

function generateTelemetry(start, count) {
    let telemetry = [];

    for (let i = 1, l = count + 1; i < l; i++) {
        let stringRep = i + 'minute';
        let logo = 'images/logo-openmct.svg';

        telemetry.push({
            "name": stringRep + " Imagery",
            "utc": start + (i * ONE_MINUTE),
            "url": location.host + '/' + logo + '?time=' + stringRep,
            "timeId": stringRep,
            "value": 100
        });
    }

    return telemetry;
}

describe("The Imagery View Layouts", () => {
    const imageryKey = 'example.imagery';
    const imageryForTimeStripKey = 'example.imagery.time-strip.view';
    const START = Date.now();
    const COUNT = 10;

    // let resolveFunction;
    let originalRouterPath;
    let telemetryPromise;
    let telemetryPromiseResolve;
    let cleanupFirst;

    let openmct;
    let parent;
    let child;
    let imageTelemetry = generateTelemetry(START - TEN_MINUTES, COUNT);
    let imageryObject = {
        identifier: {
            namespace: "",
            key: "imageryId"
        },
        name: "Example Imagery",
        type: "example.imagery",
        location: "parentId",
        modified: 0,
        persisted: 0,
        telemetry: {
            values: [
                {
                    "name": "Image",
                    "key": "url",
                    "format": "image",
                    "hints": {
                        "image": 1,
                        "priority": 3
                    },
                    "source": "url"
                    // "relatedTelemetry": {
                    //     "heading": {
                    //         "comparisonFunction": comparisonFunction,
                    //         "historical": {
                    //             "telemetryObjectId": "heading",
                    //             "valueKey": "value"
                    //         }
                    //     },
                    //     "roll": {
                    //         "comparisonFunction": comparisonFunction,
                    //         "historical": {
                    //             "telemetryObjectId": "roll",
                    //             "valueKey": "value"
                    //         }
                    //     },
                    //     "pitch": {
                    //         "comparisonFunction": comparisonFunction,
                    //         "historical": {
                    //             "telemetryObjectId": "pitch",
                    //             "valueKey": "value"
                    //         }
                    //     },
                    //     "cameraPan": {
                    //         "comparisonFunction": comparisonFunction,
                    //         "historical": {
                    //             "telemetryObjectId": "cameraPan",
                    //             "valueKey": "value"
                    //         }
                    //     },
                    //     "cameraTilt": {
                    //         "comparisonFunction": comparisonFunction,
                    //         "historical": {
                    //             "telemetryObjectId": "cameraTilt",
                    //             "valueKey": "value"
                    //         }
                    //     },
                    //     "sunOrientation": {
                    //         "comparisonFunction": comparisonFunction,
                    //         "historical": {
                    //             "telemetryObjectId": "sunOrientation",
                    //             "valueKey": "value"
                    //         }
                    //     }
                    // }
                },
                {
                    "name": "Name",
                    "key": "name",
                    "source": "name",
                    "hints": {
                        "priority": 0
                    }
                },
                {
                    "name": "Time",
                    "key": "utc",
                    "format": "utc",
                    "hints": {
                        "domain": 2,
                        "priority": 1
                    },
                    "source": "utc"
                },
                {
                    "name": "Local Time",
                    "key": "local",
                    "format": "local-format",
                    "hints": {
                        "domain": 1,
                        "priority": 2
                    },
                    "source": "local"
                }
            ]
        }
    };

    // this setups up the app
    beforeEach((done) => {
        cleanupFirst = [];

        openmct = createOpenMct();
        openmct.time.timeSystem('utc', {
            start: START - (5 * ONE_MINUTE),
            end: START + (5 * ONE_MINUTE)
        });

        telemetryPromise = new Promise((resolve) => {
            telemetryPromiseResolve = resolve;
        });

        spyOn(openmct.telemetry, 'request').and.callFake(() => {
            telemetryPromiseResolve(imageTelemetry);

            return telemetryPromise;
        });

        parent = document.createElement('div');
        parent.style.width = '640px';
        parent.style.height = '480px';

        child = document.createElement('div');
        child.style.width = '640px';
        child.style.height = '480px';

        parent.appendChild(child);
        document.body.appendChild(parent);

        spyOn(window, 'ResizeObserver').and.returnValue({
            observe() {},
            disconnect() {}
        });

        //spyOn(openmct.telemetry, 'request').and.returnValue(Promise.resolve([]));
        spyOn(openmct.objects, 'get').and.returnValue(Promise.resolve(imageryObject));

        originalRouterPath = openmct.router.path;

        openmct.on('start', done);
        openmct.startHeadless();
    });

    afterEach((done) => {
        openmct.router.path = originalRouterPath;

        // Needs to be in a timeout because plots use a bunch of setTimeouts, some of which can resolve during or after
        // teardown, which causes problems
        // This is hacky, we should find a better approach here.
        setTimeout(() => {
            //Cleanup code that needs to happen before dom elements start being destroyed
            cleanupFirst.forEach(cleanup => cleanup());
            cleanupFirst = [];
            document.body.removeChild(parent);

            resetApplicationState(openmct).then(done).catch(done);
        });
    });

    it("should provide an imagery time strip view when in a time strip", () => {
        openmct.router.path = [{
            identifier: {
                key: 'test-timestrip',
                namespace: ''
            },
            type: 'time-strip'
        }];

        let applicableViews = openmct.objectViews.get(imageryObject, [imageryObject, {
            identifier: {
                key: 'test-timestrip',
                namespace: ''
            },
            type: 'time-strip'
        }]);
        let imageryView = applicableViews.find(
            viewProvider => viewProvider.key === imageryForTimeStripKey
        );

        expect(imageryView).toBeDefined();
    });

    it("should provide an imagery view only for imagery producing objects", () => {
        let applicableViews = openmct.objectViews.get(imageryObject, [imageryObject]);
        let imageryView = applicableViews.find(
            viewProvider => viewProvider.key === imageryKey
        );

        expect(imageryView).toBeDefined();
    });

    it("should not provide an imagery view when in a time strip", () => {
        openmct.router.path = [{
            identifier: {
                key: 'test-timestrip',
                namespace: ''
            },
            type: 'time-strip'
        }];

        let applicableViews = openmct.objectViews.get(imageryObject, [imageryObject, {
            identifier: {
                key: 'test-timestrip',
                namespace: ''
            },
            type: 'time-strip'
        }]);
        let imageryView = applicableViews.find(
            viewProvider => viewProvider.key === imageryKey
        );

        expect(imageryView).toBeUndefined();
    });

    it("should provide an imagery view when navigated to in the composition of a time strip", () => {
        openmct.router.path = [imageryObject];

        let applicableViews = openmct.objectViews.get(imageryObject, [imageryObject, {
            identifier: {
                key: 'test-timestrip',
                namespace: ''
            },
            type: 'time-strip'
        }]);
        let imageryView = applicableViews.find(
            viewProvider => viewProvider.key === imageryKey
        );

        expect(imageryView).toBeDefined();
    });

    describe("imagery view", () => {
        let applicableViews;
        let imageryViewProvider;
        let imageryView;

        beforeEach(() => {

            applicableViews = openmct.objectViews.get(imageryObject, [imageryObject]);
            imageryViewProvider = applicableViews.find(viewProvider => viewProvider.key === imageryKey);
            imageryView = imageryViewProvider.view(imageryObject, [imageryObject]);
            imageryView.show(child);

            return Vue.nextTick();
        });

        // afterEach(() => {
        //     openmct.time.stopClock();
        //     openmct.router.removeListener('change:hash', resolveFunction);
        //
        //     imageryView.destroy();
        // });

        it("on mount should show the the most recent image", (done) => {
            //Looks like we need Vue.nextTick here so that computed properties settle down
            Vue.nextTick(() => {
                const imageInfo = getImageInfo(parent);

                expect(imageInfo.url.indexOf(imageTelemetry[COUNT - 1].timeId)).not.toEqual(-1);
                done();
            });
        });

        it("should show the clicked thumbnail as the main image", (done) => {
            //Looks like we need Vue.nextTick here so that computed properties settle down
            Vue.nextTick(() => {
                const target = imageTelemetry[5].url;
                parent.querySelectorAll(`img[src='${target}']`)[0].click();
                Vue.nextTick(() => {
                    const imageInfo = getImageInfo(parent);

                    expect(imageInfo.url.indexOf(imageTelemetry[5].timeId)).not.toEqual(-1);
                    done();
                });
            });
        });

        xit("should show that an image is new", (done) => {
            openmct.time.clock('local', {
                start: -1000,
                end: 1000
            });

            Vue.nextTick(() => {
                // used in code, need to wait to the 500ms here too
                setTimeout(() => {
                    const imageIsNew = isNew(parent);
                    expect(imageIsNew).toBeTrue();
                    done();
                }, REFRESH_CSS_MS);
            });
        });

        it("should show that an image is not new", (done) => {
            Vue.nextTick(() => {
                const target = imageTelemetry[2].url;
                parent.querySelectorAll(`img[src='${target}']`)[0].click();

                Vue.nextTick(() => {
                    const imageIsNew = isNew(parent);

                    expect(imageIsNew).toBeFalse();
                    done();
                });
            });
        });

        it("should navigate via arrow keys", (done) => {
            Vue.nextTick(() => {
                let keyOpts = {
                    element: parent.querySelector('.c-imagery'),
                    key: 'ArrowLeft',
                    keyCode: 37,
                    type: 'keyup'
                };

                simulateKeyEvent(keyOpts);

                Vue.nextTick(() => {
                    const imageInfo = getImageInfo(parent);

                    expect(imageInfo.url.indexOf(imageTelemetry[COUNT - 2].timeId)).not.toEqual(-1);
                    done();
                });
            });
        });

        it("should navigate via numerous arrow keys", (done) => {
            Vue.nextTick(() => {
                let element = parent.querySelector('.c-imagery');
                let type = 'keyup';
                let leftKeyOpts = {
                    element,
                    type,
                    key: 'ArrowLeft',
                    keyCode: 37
                };
                let rightKeyOpts = {
                    element,
                    type,
                    key: 'ArrowRight',
                    keyCode: 39
                };

                // left thrice
                simulateKeyEvent(leftKeyOpts);
                simulateKeyEvent(leftKeyOpts);
                simulateKeyEvent(leftKeyOpts);
                // right once
                simulateKeyEvent(rightKeyOpts);

                Vue.nextTick(() => {
                    const imageInfo = getImageInfo(parent);

                    expect(imageInfo.url.indexOf(imageTelemetry[COUNT - 3].timeId)).not.toEqual(-1);
                    done();
                });
            });
        });
        it ('shows an auto scroll button when scroll to left', (done) => {
            Vue.nextTick(() => {
                // to mock what a scroll would do
                imageryView._getInstance().$refs.ImageryContainer.autoScroll = false;
                Vue.nextTick(() => {
                    let autoScrollButton = parent.querySelector('.c-imagery__auto-scroll-resume-button');
                    expect(autoScrollButton).toBeTruthy();
                    done();
                });
            });
        });
        it ('scrollToRight is called when clicking on auto scroll button', (done) => {
            Vue.nextTick(() => {
                // use spyon to spy the scroll function
                spyOn(imageryView._getInstance().$refs.ImageryContainer, 'scrollToRight');
                imageryView._getInstance().$refs.ImageryContainer.autoScroll = false;
                Vue.nextTick(() => {
                    parent.querySelector('.c-imagery__auto-scroll-resume-button').click();
                    expect(imageryView._getInstance().$refs.ImageryContainer.scrollToRight).toHaveBeenCalledWith('reset');
                    done();
                });
            });
        });
    });

    describe("imagery time strip view", () => {
        let applicableViews;
        let imageryViewProvider;
        let imageryView;
        let componentView;

        beforeEach(() => {
            openmct.time.timeSystem('utc', {
                start: START - (5 * ONE_MINUTE),
                end: START + (5 * ONE_MINUTE)
            });

            openmct.router.path = [{
                identifier: {
                    key: 'test-timestrip',
                    namespace: ''
                },
                type: 'time-strip'
            }];

            applicableViews = openmct.objectViews.get(imageryObject, [imageryObject, {
                identifier: {
                    key: 'test-timestrip',
                    namespace: ''
                },
                type: 'time-strip'
            }]);
            imageryViewProvider = applicableViews.find(viewProvider => viewProvider.key === imageryForTimeStripKey);
            imageryView = imageryViewProvider.view(imageryObject, [imageryObject, {
                identifier: {
                    key: 'test-timestrip',
                    namespace: ''
                },
                type: 'time-strip'
            }]);
            imageryView.show(child);

            componentView = imageryView.getComponent().$children[0];
            spyOn(componentView.previewAction, 'invoke').and.callThrough();

            return Vue.nextTick();
        });

        it("on mount should show imagery within the given bounds", (done) => {
            Vue.nextTick(() => {
                const imageElements = parent.querySelectorAll('.c-imagery-tsv__image-wrapper');
                expect(imageElements.length).toEqual(6);
                done();
            });
        });

        it("should show the clicked thumbnail as the preview image", (done) => {
            Vue.nextTick(() => {
                const mouseDownEvent = createMouseEvent("mousedown");
                let imageWrapper = parent.querySelectorAll(`.c-imagery-tsv__image-wrapper`);
                imageWrapper[2].dispatchEvent(mouseDownEvent);

                Vue.nextTick(() => {
                    expect(componentView.previewAction.invoke).toHaveBeenCalledWith([componentView.objectPath[0]], {
                        indexForFocusedImage: 2,
                        objectPath: componentView.objectPath
                    });
                    done();
                });
            });
        });
    });
});
