import 'vtk.js/Sources/favicon';

// import { mat4 } from 'gl-matrix';

import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';

import vtkResliceCursorWidget from 'vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursorWidget';
import vtkResliceCursorLineRepresentation from 'vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursorLineRepresentation';
// import vtkResliceCursorRepresentation from 'vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursorRepresentation';
import vtkResliceCursor from 'vtk.js/Sources/Interaction/Widgets/ResliceCursor/ResliceCursor';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';

// import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
// import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';
// import vtkImageReslice from 'vtk.js/Sources/Imaging/Core/ImageReslice';

import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkLineSource from 'vtk.js/Sources/Filters/Sources/LineSource';

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------
const container = document.querySelector('body');
const imageData = vtkImageData.newInstance();
const s = 0.1;
imageData.setSpacing(s, s, s);
imageData.setExtent(0, 127, 0, 127, 0, 127);
const dims = [128, 128, 128];

const newArray = new Uint8Array(dims[0] * dims[1] * dims[2]);

let i = 0;
for (let z = 0; z < dims[2]; z++) {
  for (let y = 0; y < dims[1]; y++) {
    for (let x = 0; x < dims[0]; x++) {
      newArray[i++] = 256 * (i % (dims[0] * dims[1])) / (dims[0] * dims[1]);
    }
  }
}

const da = vtkDataArray.newInstance({
  numberOfComponents: 1,
  values: newArray,
});
da.setName('scalars');

imageData.getPointData().setScalars(da);

const resliceCursor = vtkResliceCursor.newInstance();
resliceCursor.setImage(imageData);

// RIGHT:

const rightRenderWindowContainer = document.createElement('div');
container.appendChild(rightRenderWindowContainer);
rightRenderWindowContainer.style.position = 'absolute';
rightRenderWindowContainer.style.right = '0px';
rightRenderWindowContainer.style.width = '50%';
rightRenderWindowContainer.style.height = '100%';

const rightRenderWindow = vtkRenderWindow.newInstance();
const rightRenderer = vtkRenderer.newInstance();
rightRenderWindow.addRenderer(rightRenderer);
rightRenderer.getActiveCamera().setParallelProjection(true);

const rightGLwindow = vtkOpenGLRenderWindow.newInstance();
rightGLwindow.setContainer(rightRenderWindowContainer);
rightRenderWindow.addView(rightGLwindow);

const rightInteractor = vtkRenderWindowInteractor.newInstance();
rightInteractor.setView(rightGLwindow);
rightInteractor.initialize();
rightInteractor.bindEvents(rightRenderWindowContainer);
rightRenderWindow.setInteractor(rightInteractor);

const rightResliceCursorWidget = vtkResliceCursorWidget.newInstance();
const rightResliceCursorRepresentation = vtkResliceCursorLineRepresentation.newInstance();
rightResliceCursorWidget.setWidgetRep(rightResliceCursorRepresentation);
rightResliceCursorRepresentation.getReslice().setInputData(imageData);
//
// let axes = mat4.create();
// axes = mat4.set(
//   axes,
//   0,
//   1,
//   0,
//   0,
//   0,
//   0,
//   1,
//   0,
//   0.019139107316732407,
//   -0.9998168349266052,
//   0,
//   0,
//   0.2430221438407898,
//   -25.395347595214844,
//   -12.699999809265137,
//   1
// );
// rightResliceCursorRepresentation.getReslice().setResliceAxes(axes);
// rightResliceCursorRepresentation.getReslice().update();
// rightResliceCursorRepresentation.modified();

rightResliceCursorRepresentation
  .getCursorAlgorithm()
  .setResliceCursor(resliceCursor);

rightResliceCursorRepresentation
  .getCursorAlgorithm()
  .setReslicePlaneNormalToZAxis();

rightResliceCursorWidget.setInteractor(rightInteractor);
rightResliceCursorWidget.setEnabled(true);
rightRenderer.setBackground(1, 0.5, 0.5);

const mapper = vtkMapper.newInstance();
mapper.setInputConnection(
  rightResliceCursorRepresentation.getPlaneSource().getOutputPort()
);
const actor = vtkActor.newInstance();
actor.setMapper(mapper);
rightRenderer.addActor(actor);

// Add axes
/* Define lines */
const lengthAxis = 1;
const origin = [-15, -15, 0];
const xAxis = vtkLineSource.newInstance({
  point1: origin,
  point2: [origin[0] + lengthAxis, origin[1], origin[2]],
});
const yAxis = vtkLineSource.newInstance({
  point1: origin,
  point2: [origin[0], origin[1] + lengthAxis, origin[2]],
});
const zAxis = vtkLineSource.newInstance({
  point1: origin,
  point2: [origin[0], origin[1], origin[2] + lengthAxis],
});

/* Define actors */

const mapperX = vtkMapper.newInstance();
mapperX.setInputConnection(xAxis.getOutputPort());
const actorX = vtkActor.newInstance();
actorX.setMapper(mapperX);
actorX.getProperty().setColor(1, 1, 0);

const mapperY = vtkMapper.newInstance();
mapperY.setInputConnection(yAxis.getOutputPort());
const actorY = vtkActor.newInstance();
actorY.setMapper(mapperY);
actorY.getProperty().setColor(0, 1, 1);

const mapperZ = vtkMapper.newInstance();
mapperZ.setInputConnection(zAxis.getOutputPort());
const actorZ = vtkActor.newInstance();
actorZ.setMapper(mapperZ);
actorZ.getProperty().setColor(1, 0, 0);

/* Add to renderer */

rightRenderer.addActor(actorX);
rightRenderer.addActor(actorY);
rightRenderer.addActor(actorZ);

rightRenderer.resetCamera();
rightRenderWindow.render();

// LEFT:

const leftRenderWindowContainer = document.createElement('div');
container.appendChild(leftRenderWindowContainer);
leftRenderWindowContainer.style.position = 'absolute';
leftRenderWindowContainer.style.left = '0px';
leftRenderWindowContainer.style.width = '50%';
leftRenderWindowContainer.style.height = '100%';

const leftRenderWindow = vtkRenderWindow.newInstance();
const leftRenderer = vtkRenderer.newInstance();
leftRenderWindow.addRenderer(leftRenderer);
// leftRenderer.getActiveCamera().setParallelProjection(true);

const leftGLwindow = vtkOpenGLRenderWindow.newInstance();
leftGLwindow.setContainer(leftRenderWindowContainer);
leftRenderWindow.addView(leftGLwindow);

const leftInteractor = vtkRenderWindowInteractor.newInstance();
leftInteractor.setView(leftGLwindow);
leftInteractor.initialize();
leftInteractor.bindEvents(leftRenderWindowContainer);
leftRenderWindow.setInteractor(leftInteractor);

const leftResliceCursorWidget = vtkResliceCursorWidget.newInstance();
const leftResliceCursorRepresentation = vtkResliceCursorLineRepresentation.newInstance();
leftResliceCursorWidget.setWidgetRep(leftResliceCursorRepresentation);
leftResliceCursorRepresentation.getReslice().setInputData(imageData);

// let axes = mat4.create();
// axes = mat4.set(
//   axes,
//   0,
//   1,
//   0,
//   0,
//   0,
//   0,
//   1,
//   0,
//   0.019139107316732407,
//   -0.9998168349266052,
//   0,
//   0,
//   0.2430221438407898,
//   -25.395347595214844,
//   -12.699999809265137,
//   1
// );
// leftResliceCursorRepresentation.getReslice().setResliceAxes(axes);

leftResliceCursorRepresentation
  .getCursorAlgorithm()
  .setResliceCursor(resliceCursor);
leftResliceCursorRepresentation
  .getCursorAlgorithm()
  .setReslicePlaneNormalToXAxis();

leftResliceCursorRepresentation.getReslice().update();
leftResliceCursorWidget.setInteractor(leftInteractor);
leftResliceCursorWidget.setEnabled(true);
leftRenderer.setBackground(1, 0.5, 0.5);

const mapper2 = vtkMapper.newInstance();
mapper2.setInputConnection(
  leftResliceCursorRepresentation.getPlaneSource().getOutputPort()
);
const actor2 = vtkActor.newInstance();
actor2.setMapper(mapper2);
leftRenderer.addActor(actor2);

// Add axes
/* Define lines */
const lengthAxis2 = 1;
const origin2 = [-15, -15, 0];
const xAxis2 = vtkLineSource.newInstance({
  point1: origin2,
  point2: [origin2[0] + lengthAxis2, origin2[1], origin2[2]],
});
const yAxis2 = vtkLineSource.newInstance({
  point1: origin2,
  point2: [origin2[0], origin2[1] + lengthAxis2, origin2[2]],
});
const zAxis2 = vtkLineSource.newInstance({
  point1: origin2,
  point2: [origin2[0], origin2[1], origin2[2] + lengthAxis2],
});

/* Define actors */

const mapperX2 = vtkMapper.newInstance();
mapperX2.setInputConnection(xAxis2.getOutputPort());
const actorX2 = vtkActor.newInstance();
actorX2.setMapper(mapperX2);
actorX2.getProperty().setColor(1, 1, 0);

const mapperY2 = vtkMapper.newInstance();
mapperY2.setInputConnection(yAxis2.getOutputPort());
const actorY2 = vtkActor.newInstance();
actorY2.setMapper(mapperY2);
actorY2.getProperty().setColor(0, 1, 1);

const mapperZ2 = vtkMapper.newInstance();
mapperZ2.setInputConnection(zAxis2.getOutputPort());
const actorZ2 = vtkActor.newInstance();
actorZ2.setMapper(mapperZ2);
actorZ2.getProperty().setColor(1, 0, 0);

/* Add to renderer */

leftRenderer.addActor(actorX2);
leftRenderer.addActor(actorY2);
leftRenderer.addActor(actorZ2);

leftRenderer.resetCamera();
leftRenderWindow.render();

const resize = () => {
  // right

  let dims2 = rightRenderWindowContainer.getBoundingClientRect();
  let devicePixelRatio = window.devicePixelRatio || 1;
  rightGLwindow.setSize(
    Math.floor(dims2.width * devicePixelRatio),
    Math.floor(dims2.height * devicePixelRatio)
  );
  rightRenderWindow.render();

  // left

  dims2 = leftRenderWindowContainer.getBoundingClientRect();
  devicePixelRatio = window.devicePixelRatio || 1;
  leftGLwindow.setSize(
    Math.floor(dims2.width * devicePixelRatio),
    Math.floor(dims2.height * devicePixelRatio)
  );
  leftRenderWindow.render();
};

window.addEventListener('resize', resize());
