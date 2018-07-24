import { vec3, mat4 } from 'gl-matrix';
import macro from 'vtk.js/Sources/macro';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkMath from 'vtk.js/Sources/Common/Core/Math';
import vtkPolyData from 'vtk.js/Sources/Common/DataModel/PolyData';

const { vtkWarningMacro } = macro;

// ----------------------------------------------------------------------------
// vtkPlaneSource methods
// ----------------------------------------------------------------------------

function vtkPlaneSource(publicAPI, model) {
  // Set our className
  model.classHierarchy.push('vtkPlaneSource');

  publicAPI.requestData = (inData, outData) => {
    if (model.deleted) {
      return;
    }

    const dataset = outData[0];

    // Check input
    const pointDataType = dataset
      ? dataset.getPoints().getDataType()
      : 'Float32Array';
    const pd = vtkPolyData.newInstance();
    const v10 = new Float32Array(3);
    const v20 = new Float32Array(3);
    // const n = new Float32Array(3);
    vtkMath.subtract(model.point1, model.origin, v10);
    vtkMath.subtract(model.point2, model.origin, v20);

    // vtkMath.cross(v10, v20, n);
    // if (vtkMath.norm(n) <= 0.0) {
    if (!publicAPI.updatePlane(v10, v20)) {
      vtkWarningMacro('Bad plane definition');
      return;
    }

    // hand create a plane with special scalars
    const xres = model.xResolution;
    const yres = model.yResolution;
    const numPts = (xres + 1) * (yres + 1);
    const numPolys = xres * yres;

    // Points
    const points = new window[pointDataType](numPts * 3);
    pd.getPoints().setData(points, 3);

    // Cells
    const polys = new Uint32Array(5 * numPolys);
    pd.getPolys().setData(polys, 1);

    // Normals
    const normalsData = new Float32Array(numPts * 3);
    const normals = vtkDataArray.newInstance({
      numberOfComponents: 3,
      values: normalsData,
      name: 'Normals',
    });
    pd.getPointData().setNormals(normals);

    // Texture coords
    const tcData = new Float32Array(numPts * 2);
    const tcoords = vtkDataArray.newInstance({
      numberOfComponents: 2,
      values: tcData,
      name: 'TextureCoordinates',
    });
    pd.getPointData().setTCoords(tcoords);

    const tc = new Float32Array(2);
    let idx = 0;
    for (let j = 0; j < yres + 1; j++) {
      tc[1] = j / yres;
      for (let i = 0; i < xres + 1; i++) {
        tc[0] = i / xres;

        points[idx * 3] = model.origin[0] + tc[0] * v10[0] + tc[1] * v20[0];
        points[idx * 3 + 1] = model.origin[1] + tc[0] * v10[1] + tc[1] * v20[1];
        points[idx * 3 + 2] = model.origin[2] + tc[0] * v10[2] + tc[1] * v20[2];

        tcData[idx * 2] = tc[0];
        tcData[idx * 2 + 1] = tc[1];

        normalsData[idx * 3] = model.normal[0];
        normalsData[idx * 3 + 1] = model.normal[1];
        normalsData[idx * 3 + 2] = model.normal[2];

        idx++;
      }
    }

    // Generate polygon connectivity
    //
    idx = 0;
    for (let j = 0; j < yres; j++) {
      for (let i = 0; i < xres; i++) {
        polys[idx * 5 + 0] = 4;
        polys[idx * 5 + 1] = i + j * (xres + 1);
        polys[idx * 5 + 2] = polys[idx * 5 + 1] + 1;
        polys[idx * 5 + 3] = polys[idx * 5 + 1] + xres + 2;
        polys[idx * 5 + 4] = polys[idx * 5 + 1] + xres + 1;

        idx++;
      }
    }

    // Update output
    outData[0] = pd;
  };

  publicAPI.setNormal = (x, y, z) => {
    const normal = [x, y, z];

    if (vtkMath.normalize(normal) !== 0) {
      const dp = vtkMath.dot(model.normal, normal);

      let theta = 0;
      const rotationVector = [];

      if (dp < 1.0) {
        if (dp <= -1.0) {
          theta = 180.0;
          vtkMath.subtract(model.point1, model.origin, rotationVector);
        } else {
          vtkMath.cross(model.normal, normal, rotationVector);
          theta = vtkMath.degreesFromRadians(Math.acos(dp));
        }
        // Create rotation matrix
        const transform = mat4.create();
        const negCenter = [];

        vec3.negate(negCenter, model.center);

        mat4.translate(transform, transform, negCenter);
        mat4.rotate(
          transform,
          transform,
          vtkMath.radiansFromDegrees(theta),
          rotationVector
        );
        mat4.translate(transform, transform, model.center);

        vec3.transformMat4(model.origin, transform, model.origin);
        vec3.transformMat4(model.point1, transform, model.point1);
        vec3.transformMat4(model.point2, transform, model.point2);

        model.normal = [...normal];
        publicAPI.modified();
      }
    }
  };

  publicAPI.setCenter = (x, y, z) => {
    const center = [x, y, z];
    if (!vec3.exactEquals(center, model.center)) {
      const v1 = [];
      vtkMath.subtract(model.point1, model.origin, v1);

      const v2 = [];
      vtkMath.subtract(model.point2, model.origin, v2);

      for (let i = 0; i < 3; i++) {
        model.center[i] = center[i];
        model.origin[i] = model.center[i] - 0.5 * (v1[i] + v2[i]);
        model.point1[i] = model.origin[i] + v1[i];
        model.point2[i] = model.origin[i] + v2[i];
      }
      publicAPI.modified();
    }
  };

  publicAPI.setPoint1 = (x, y, z) => {
    const point1 = [x, y, z];
    if (!vec3.exactEquals(point1, model.point1)) {
      const v1 = [];
      const v2 = [];

      model.point1 = [...point1];
      vtkMath.subtract(model.point1, model.origin, v1);
      vtkMath.subtract(model.point2, model.origin, v2);

      // set plane normal
      publicAPI.updatePlane(v1, v2);
      publicAPI.modified();
    }
  };

  publicAPI.setPoint2 = (x, y, z) => {
    const point2 = [x, y, z];
    if (!vec3.exactEquals(point2, model.point2)) {
      const v1 = [];
      const v2 = [];

      model.point2 = [...point2];
      vtkMath.subtract(model.point1, model.origin, v1);
      vtkMath.subtract(model.point2, model.origin, v2);

      // set plane normal
      publicAPI.updatePlane(v1, v2);
      publicAPI.modified();
    }
  };

  publicAPI.updatePlane = (v1, v2) => {
    // set plane center
    for (let i = 0; i < 3; i++) {
      model.center[i] = model.origin[i] + 0.5 * (v1[i] + v2[i]);
    }

    // set plane normal
    vtkMath.cross(v1, v2, model.normal);

    return vtkMath.normalize(model.normal) !== 0.0;
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------

const DEFAULT_VALUES = {
  xResolution: 10,
  yResolution: 10,
  origin: [0, 0, 0],
  point1: [1, 0, 0],
  point2: [0, 1, 0],
  pointType: 'Float32Array',
};

// ----------------------------------------------------------------------------

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Build VTK API
  macro.obj(publicAPI, model);
  macro.setGet(publicAPI, model, ['xResolution', 'yResolution']);
  macro.setGetArray(
    publicAPI,
    model,
    ['origin', 'point1', 'point2', 'normal'],
    3
  );

  model.normal = [0, 0, 1];
  model.center = [0, 0, 0];

  macro.algo(publicAPI, model, 0, 1);
  vtkPlaneSource(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(extend, 'vtkPlaneSource');

// ----------------------------------------------------------------------------

export default { newInstance, extend };
