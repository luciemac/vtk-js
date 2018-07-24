import test from 'tape-catch';
import testUtils from 'vtk.js/Sources/Testing/testUtils';

import { mat4 } from 'gl-matrix';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkImageMapper from 'vtk.js/Sources/Rendering/Core/ImageMapper';
import vtkImageSlice from 'vtk.js/Sources/Rendering/Core/ImageSlice';
import vtkImageReslice from 'vtk.js/Sources/Imaging/Core/ImageReslice';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';

import baseline1 from './testReslice.png';

test.onlyIfWebGL('Test vtkImageReslice Rendering', (t) => {
  const gc = testUtils.createGarbageCollector(t);
  t.ok('rendering', 'vtkImageReslice Rendering');

  // Create some control UI
  const container = document.querySelector('body');
  const renderWindowContainer = gc.registerDOMElement(
    document.createElement('div')
  );
  container.appendChild(renderWindowContainer);

  // create what we will view
  const renderWindow = gc.registerResource(vtkRenderWindow.newInstance());
  const renderer = gc.registerResource(vtkRenderer.newInstance());
  renderWindow.addRenderer(renderer);
  renderer.setBackground(0.32, 0.34, 0.43);

  const imageData = gc.registerResource(vtkImageData.newInstance());
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
  const imageMapper = gc.registerResource(vtkImageMapper.newInstance());
  imageMapper.setInputData(imageData);
  const imageActor = gc.registerResource(vtkImageSlice.newInstance());
  imageActor.setMapper(imageMapper);
  // renderer.addActor(imageActor);

  imageMapper.setKSlice(dims[2] / 2);

  const imageReslice = gc.registerResource(vtkImageReslice.newInstance());
  imageReslice.setInputData(imageData);
  imageReslice.setOutputDimensionality(2);
  const axes = mat4.create();
  mat4.rotateZ(axes, axes, 45 * Math.PI / 180);
  // axes = mat4.set(
  //   axes,
  //   1,
  //   0,
  //   0,
  //   0,
  //   0,
  //   1,
  //   0,
  //   0,
  //   0,
  //   -0.9507009387016296,
  //   0.3101092278957367,
  //   0,
  //   -12.699999809265137,
  //   -24.178668975830078,
  //   3.7442283630371094,
  //   1
  // );
  imageReslice.setResliceAxes(axes);
  imageReslice.setBorder(true);
  imageReslice.setOutputScalarType('Uint16Array');
  imageReslice.setScalarScale(65535 / 255);
  imageReslice.setAutoCropOutput(true);
  // imageReslice.setOutputOrigin([
  //   dims[0] * s / 2,
  //   dims[1] * s / 2,
  //   dims[2] * s / 2,
  // ]);

  const resliceMapper = gc.registerResource(vtkImageMapper.newInstance());
  resliceMapper.setInputConnection(imageReslice.getOutputPort());
  // resliceMapper.setKSlice(0);
  const resliceActor = gc.registerResource(vtkImageSlice.newInstance());
  resliceActor.setMapper(resliceMapper);
  // resliceActor.setUserMatrix(axes);
  resliceActor.getProperty().setColorLevel(65535 / 2);
  resliceActor.getProperty().setColorWindow(65535);
  renderer.addActor(resliceActor);

  // now create something to view it, in this case webgl
  const glwindow = gc.registerResource(vtkOpenGLRenderWindow.newInstance());
  glwindow.setContainer(renderWindowContainer);
  renderWindow.addView(glwindow);
  glwindow.setSize(400, 400);

  // glwindow.captureNextImage().then((image) => {
  //   testUtils.compareImages(
  //     image,
  //     [baseline1],
  //     'Imaging/Core/ImageReslice/testImageReslice',
  //     t,
  //     2.5,
  //     gc.releaseResources
  //   );
  // });
  renderWindow.render();
  function sleep(delay) {
    const start = new Date().getTime();
    while (new Date().getTime() < start + delay);
  }
  sleep(500);
});

// // For comparison purpose, see below the same test in VTK/Python:
// import vtk;
// dims = [128, 128, 128];
// s = 0.1;
// imageData = vtk.vtkImageData()
// imageData.SetDimensions(dims[0], dims[1], dims[2]);
// imageData.SetSpacing(s, s, s);
// imageData.AllocateScalars(vtk.VTK_UNSIGNED_CHAR, 1);
// for z in range(dims[2]):
//   for y in range(dims[1]):
//     for x in range(dims[0]):
//       imageData.SetScalarComponentFromDouble(x, y, z, 0, 256 * ((z * dims[0] * dims[1] + y * dims[0] + x) % (dims[0] * dims[1])) / (dims[0] * dims[1]));
//
// axes = vtk.vtkMatrix4x4();
// axes.SetElement(0, 0, 1);
// axes.SetElement(0, 1, 0);
// axes.SetElement(0, 2, 0);
// axes.SetElement(0, 3, -12.699999809265137);
// axes.SetElement(1, 0, 0);
// axes.SetElement(1, 1, 1);
// axes.SetElement(1, 2, -0.9507009387016296);
// axes.SetElement(1, 3, -24.178668975830078);
// axes.SetElement(2, 0, 0);
// axes.SetElement(2, 1, 0);
// axes.SetElement(2, 2, 0.3101092278957367);
// axes.SetElement(2, 3, 3.7442283630371094);
// axes.SetElement(3, 0, 0);
// axes.SetElement(3, 1, 0);
// axes.SetElement(3, 2, 0);
// axes.SetElement(3, 3, 1);
//
//
// # axes = vtk.vtkTransform();
// # axes.RotateX(45);
//
// reslice = vtk.vtkImageReslice();
// reslice.SetOutputDimensionality(2);
// reslice.SetTransformInputSampling(0);
// reslice.SetAutoCropOutput(1);
// reslice.SetInputData(imageData);
// reslice.SetResliceAxes(axes);
// reslice.BorderOn();
// reslice.SetOutputScalarType(vtk.VTK_UNSIGNED_SHORT);
// reslice.SetScalarScale(65535 / 255);
// # reslice.SetOutputOrigin(dims[0] * s/2, dims[1] * s/2, dims[2] *s/2);
//
// mapper = vtk.vtkImageSliceMapper();
// # mapper.SetInputData(imageData);
// mapper.SetInputConnection(reslice.GetOutputPort());
// actor = vtk.vtkImageActor();
// actor.SetMapper(mapper);
//
// ip = actor.GetProperty();
// ip.SetColorLevel(65535/2);
// ip.SetColorWindow(65535);
//
// renderer = vtk.vtkRenderer();
// renderer.AddActor(actor);
// renderer.SetBackground(0.32, 0.34, 0.43);
//
// vm = vtk.vtkSmartVolumeMapper();
// vm.SetBlendModeToComposite();
// vm.SetInputData(imageData);
// #vm.SetInputConnection(reslice.GetOutputPort());
//
// volumeProperty = vtk.vtkVolumeProperty();
// volumeProperty.ShadeOff();
//
// compositeOpacity = vtk.vtkPiecewiseFunction();
// compositeOpacity.AddPoint(255.0,0.0);
// compositeOpacity.AddPoint(255.0,1.0);
// volumeProperty.SetScalarOpacity(compositeOpacity);
//
// color = vtk.vtkColorTransferFunction();
// color.AddRGBPoint(0.0,  0.0,0.0,0.0);
// color.AddRGBPoint(255.0,1.0,1.0,1.0);
// volumeProperty.SetColor(color);
//
// volume = vtk.vtkVolume();
// volume.SetMapper(vm);
// volume.SetProperty(volumeProperty);
// # actor.SetUserTransform(axes):
// # volume.SetUserTransform(axes);
// # renderer.AddViewProp(volume);
//
// renderWindow = vtk.vtkRenderWindow();
// renderWindow.AddRenderer(renderer);
//
// renderWindowInteractor = vtk.vtkRenderWindowInteractor();
// renderWindowInteractor.SetRenderWindow(renderWindow);
// renderWindowInteractor.Initialize();
// renderWindowInteractor.Start();