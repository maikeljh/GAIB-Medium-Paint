// Vertex shader program
const vertex_shader_source = `
            attribute vec4 aVertexPosition;
            void main(void) {
                gl_Position = aVertexPosition;
            }
        `;

// Fragment shader program
const fragment_shader_source = `
            uniform lowp vec4 uColor;
            void main(void) {
                gl_FragColor = uColor;
            }
        `;

// Create shader program
const create_shader_program = (
  gl,
  vertex_shader_source,
  fragment_shader_source
) => {
  // Creates vertex and fragment shader
  const vertex_shader = load_shader(gl, gl.VERTEX_SHADER, vertex_shader_source);
  const fragment_shader = load_shader(
    gl,
    gl.FRAGMENT_SHADER,
    fragment_shader_source
  );

  // Create the shader program
  const shader_program = gl.createProgram();

  // Attach shaders to program
  gl.attachShader(shader_program, vertex_shader);
  gl.attachShader(shader_program, fragment_shader);

  // Link together
  gl.linkProgram(shader_program);

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shader_program
      )}`
    );
    return null;
  }

  // Return shader program
  return shader_program;
};

// Function to load shader
const load_shader = (gl, type, source) => {
  // Create object shader
  const shader = gl.createShader(type);

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
    );
    gl.deleteShader(shader);
    return null;
  }

  // Return shader
  return shader;
};

document.addEventListener("DOMContentLoaded", function () {
  // Get HTML elements
  const canvas = document.querySelector("canvas");
  const colorPicker = document.getElementById("color");
  const penButton = document.getElementById("pen");
  const lineButton = document.getElementById("line");
  const squareButton = document.getElementById("square");
  const rectangleButton = document.getElementById("rectangle");
  const eraserButton = document.getElementById("eraser");

  // Initialize GL
  const gl = canvas.getContext("webgl");

  // Check if browser supports WebGL or not
  if (gl === null) {
    alert("Error! Browser may not support WebGL");
    return;
  }

  // Set clear color to white, fully opaque (background color)
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // Initialize a shader program
  const shader_program = create_shader_program(
    gl,
    vertex_shader_source,
    fragment_shader_source
  );

  // Get the location of the attribute variables in the shader program
  const positionAttributeLocation = gl.getAttribLocation(
    shader_program,
    "aVertexPosition"
  );

  // Create the vertex buffer
  const positionBuffer = gl.createBuffer();

  // Function to represent a shape
  class Shape {
    constructor(type, color) {
      this.type = type;
      this.color = color;
    }
  }

  // Create an array to store the drawn points
  let points = [];

  // Create an array to store the drawn shapes
  let shapes = [];

  // Create an array to store the drawn vertices
  let shapeVertices = [];

  // Create variables
  let currentTool = "pen";
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Freeform line
  let isDrawingFreeformLine = false;

  // Line
  let isDrawingLine = false;
  let lineStartX = 0;
  let lineStartY = 0;

  // Square
  let isDrawingSquare = false;
  let squareStartX = 0;
  let squareStartY = 0;

  // Rectangle
  let isDrawingRectangle = false;
  let rectangleStartX = 0;
  let rectangleStartY = 0;

  /* Handlers for drawing */
  // Event handler for mouse pressed
  canvas.addEventListener("mousedown", (e) => {
    isDrawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
  });

  // Event handler for mouse move
  canvas.addEventListener("mousemove", (e) => {
    // Only run when mouse pressed
    if (!isDrawing) return;

    // Get x and y coordinates
    const x = e.offsetX;
    const y = e.offsetY;

    // Switch cases for drawing based on selected tools
    switch (currentTool) {
      case "eraser":
        if (isDrawingFreeformLine) {
          drawFreeformLine(lastX, lastY, x, y, "#FFFFFF");
        } else {
          points = [];
          isDrawingFreeformLine = true;
        }
        break;
      case "pen":
        if (isDrawingFreeformLine) {
          drawFreeformLine(lastX, lastY, x, y, getColor());
        } else {
          points = [];
          isDrawingFreeformLine = true;
        }
        break;
      case "line":
        if (isDrawingLine) {
          drawLine(lineStartX, lineStartY, x, y, getColor());
        } else {
          lineStartX = x;
          lineStartY = y;
          isDrawingLine = true;
        }
        break;
      case "square":
        if (isDrawingSquare) {
          drawSquare(squareStartX, squareStartY, x, y, getColor());
        } else {
          squareStartX = x;
          squareStartY = y;
          isDrawingSquare = true;
        }
        break;
      case "rectangle":
        if (isDrawingRectangle) {
          drawRectangle(rectangleStartX, rectangleStartY, x, y, getColor());
        } else {
          rectangleStartX = x;
          rectangleStartY = y;
          isDrawingRectangle = true;
        }
        break;
    }

    // Get last x and y coordinates
    lastX = x;
    lastY = y;

    // After a WebGL operation, check for errors
    const glError = gl.getError();
    if (glError !== gl.NO_ERROR) {
      console.error("WebGL Error:", glError);
    }
  });

  // Event handler for mouse released
  canvas.addEventListener("mouseup", () => {
    // End drawing
    isDrawing = false;

    // Update specific isDrawing variables
    if (isDrawingFreeformLine) {
      isDrawingFreeformLine = false;
    }

    if (isDrawingLine) {
      isDrawingLine = false;

      // Convert canvas coordinates to normalized device coordinates
      const ndcX1 = (lineStartX / canvas.width) * 2 - 1;
      const ndcY1 = 1 - (lineStartY / canvas.height) * 2;
      const ndcX2 = (lastX / canvas.width) * 2 - 1;
      const ndcY2 = 1 - (lastY / canvas.height) * 2;

      // Save shape
      shapes.push(new Shape("line", getColor()));

      // Save vertices
      shapeVertices = shapeVertices.concat([ndcX1, ndcY1, ndcX2, ndcY2]);
    }

    if (isDrawingSquare) {
      isDrawingSquare = false;

      // Calculate the size of the square (length of sides)
      const size = Math.min(
        Math.abs(lastX - squareStartX),
        Math.abs(lastY - squareStartY)
      );

      // Calculate the direction of the square based on the mouse's position
      const dirX = lastX >= squareStartX ? 1 : -1;
      const dirY = lastY >= squareStartY ? 1 : -1;

      // Calculate the opposite corner of the square
      const oppositeX = squareStartX + dirX * size;
      const oppositeY = squareStartY + dirY * size;

      // Convert canvas coordinates to normalized device coordinates
      const ndcX1 = (squareStartX / canvas.width) * 2 - 1;
      const ndcY1 = 1 - (squareStartY / canvas.height) * 2;
      const ndcX2 = (oppositeX / canvas.width) * 2 - 1;
      const ndcY2 = 1 - (oppositeY / canvas.height) * 2;

      // Save shape
      shapes.push(new Shape("square", getColor()));

      // Save vertices
      shapeVertices = shapeVertices.concat([
        ndcX1,
        ndcY1,
        ndcX2,
        ndcY1,
        ndcX2,
        ndcY2,
        ndcX1,
        ndcY2,
        ndcX1,
        ndcY1,
      ]);
    }

    if (isDrawingRectangle) {
      isDrawingRectangle = false;

      // Convert canvas coordinates to normalized device coordinates
      const ndcX1 = (rectangleStartX / canvas.width) * 2 - 1;
      const ndcY1 = 1 - (rectangleStartY / canvas.height) * 2;
      const ndcX2 = (lastX / canvas.width) * 2 - 1;
      const ndcY2 = 1 - (lastY / canvas.height) * 2;

      // Save shape
      shapes.push(new Shape("rectangle", getColor()));

      // Save vertices
      shapeVertices = shapeVertices.concat([
        ndcX1,
        ndcY1,
        ndcX2,
        ndcY1,
        ndcX2,
        ndcY2,
        ndcX1,
        ndcY2,
        ndcX1,
        ndcY1,
      ]);
    }

    // Redraw saved shapes
    redrawShapes();
  });

  // Function to get color
  const getColor = () => {
    return colorPicker.value;
  };

  // Function to draw freeform line
  const drawFreeformLine = (x1, y1, x2, y2, color) => {
    // Redraw saved shapes
    redrawShapes();

    // Convert canvas coordinates to normalized device coordinates
    const ndcX1 = (x1 / canvas.width) * 2 - 1;
    const ndcY1 = 1 - (y1 / canvas.height) * 2;
    const ndcX2 = (x2 / canvas.width) * 2 - 1;
    const ndcY2 = 1 - (y2 / canvas.height) * 2;

    // Save shape and vertices
    const lineVertices = [ndcX1, ndcY1, ndcX2, ndcY2];
    shapes.push(new Shape("line", color));
    shapeVertices = shapeVertices.concat(lineVertices);

    // Update the points array with new points
    points.push(ndcX1, ndcY1, ndcX2, ndcY2);

    // Bind the shader program before drawing
    gl.useProgram(shader_program);

    // Bind the position buffer and update the vertex position data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // Set the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Enable the position attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Set the color
    const colors = getColorAsArray(color);
    const colorUniformLocation = gl.getUniformLocation(
      shader_program,
      "uColor"
    );
    gl.uniform4fv(colorUniformLocation, colors);

    // Draw the lines
    gl.drawArrays(gl.LINES, 0, points.length / 2);
  };

  const drawLine = (x1, y1, x2, y2, color) => {
    // Redraw saved shapes
    redrawShapes();

    // Convert canvas coordinates to normalized device coordinates
    const ndcX1 = (x1 / canvas.width) * 2 - 1;
    const ndcY1 = 1 - (y1 / canvas.height) * 2;
    const ndcX2 = (x2 / canvas.width) * 2 - 1;
    const ndcY2 = 1 - (y2 / canvas.height) * 2;

    // Vertex data for the line
    const vertices = [ndcX1, ndcY1, ndcX2, ndcY2];

    // Bind the shader program
    gl.useProgram(shader_program);

    // Bind the position buffer and update the vertex position data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Set the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Enable the position attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Set the color as a uniform variable
    const colorUniformLocation = gl.getUniformLocation(
      shader_program,
      "uColor"
    );
    const colors = getColorAsArray(color);
    gl.uniform4fv(colorUniformLocation, colors);

    // Draw the line
    gl.drawArrays(gl.LINES, 0, 2);
  };

  const drawSquare = (x1, y1, x2, y2, color) => {
    // Redraw saved shapes
    redrawShapes();

    // Calculate the size of the square (length of sides)
    const size = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1));

    // Calculate the direction of the square based on the mouse's position
    const dirX = x2 >= x1 ? 1 : -1;
    const dirY = y2 >= y1 ? 1 : -1;

    // Calculate the opposite corner of the square
    const oppositeX = x1 + dirX * size;
    const oppositeY = y1 + dirY * size;

    // Convert canvas coordinates to normalized device coordinates
    const ndcX1 = (x1 / canvas.width) * 2 - 1;
    const ndcY1 = 1 - (y1 / canvas.height) * 2;
    const ndcX2 = (oppositeX / canvas.width) * 2 - 1;
    const ndcY2 = 1 - (oppositeY / canvas.height) * 2;

    // Bind the shader program before drawing
    gl.useProgram(shader_program);

    // Calculate the square vertices
    const vertices = [
      ndcX1,
      ndcY1,
      ndcX2,
      ndcY1,
      ndcX2,
      ndcY2,
      ndcX1,
      ndcY2,
      ndcX1,
      ndcY1,
    ];

    // Bind the position buffer and update the vertex position data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Set the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Set the color as a uniform variable
    const colors = getColorAsArray(color);
    const colorUniformLocation = gl.getUniformLocation(
      shader_program,
      "uColor"
    );
    gl.uniform4fv(colorUniformLocation, colors);

    // Draw the square
    gl.drawArrays(gl.LINE_STRIP, 0, 5);
  };

  const drawRectangle = (x1, y1, x2, y2, color) => {
    // Redraw saved shapes
    redrawShapes();

    // Convert canvas coordinates to normalized device coordinates
    const ndcX1 = (x1 / canvas.width) * 2 - 1;
    const ndcY1 = 1 - (y1 / canvas.height) * 2;
    const ndcX2 = (x2 / canvas.width) * 2 - 1;
    const ndcY2 = 1 - (y2 / canvas.height) * 2;

    // Calculate the rectangle vertices
    const vertices = [
      ndcX1,
      ndcY1,
      ndcX2,
      ndcY1,
      ndcX2,
      ndcY2,
      ndcX1,
      ndcY2,
      ndcX1,
      ndcY1,
    ];

    // Bind the shader program before drawing
    gl.useProgram(shader_program);

    // Bind the position buffer and update the vertex position data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Set the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Set the color as a uniform variable
    const colors = getColorAsArray(color);
    const colorUniformLocation = gl.getUniformLocation(
      shader_program,
      "uColor"
    );
    gl.uniform4fv(colorUniformLocation, colors);

    // Draw the rectangle
    gl.drawArrays(gl.LINE_LOOP, 0, 5);
  };

  const redrawShapes = () => {
    // Bind the shader program before drawing
    gl.useProgram(shader_program);

    // Bind the position buffer and update the vertex position data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(shapeVertices),
      gl.STATIC_DRAW
    );

    // Set the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Enable the position attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Initialize index vertices
    let idxVertices = 0;

    // Draw all shapes
    for (let i = 0; i < shapes.length; i++) {
      // Get type and color each shape
      const { type, color } = shapes[i];

      // Get number vertices
      const numVertices = type === "line" ? 2 : 5;

      // Set the color
      const colors = getColorAsArray(color);
      const colorUniformLocation = gl.getUniformLocation(
        shader_program,
        "uColor"
      );
      gl.uniform4fv(colorUniformLocation, colors);

      // Draw the shapes based on their type
      switch (type) {
        case "line":
          // Draw arrays
          gl.drawArrays(gl.LINES, idxVertices, numVertices);

          // Update index vertices
          idxVertices += 2;
          break;
        case "square":
        case "rectangle":
          // Draw arrays
          gl.drawArrays(gl.LINE_STRIP, idxVertices, numVertices);

          // Update index vertices
          idxVertices += 5;
          break;
      }
    }
  };

  // Function to clear the canvas and the points array
  const clearCanvas = () => {
    // Clear the points array
    points = [];
    shapes = [];
    shapeVertices = [];

    // Bind the shader program before drawing
    gl.useProgram(shader_program);

    // Bind the position buffer and update the vertex position data
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    // Set the position attribute
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Enable the position attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Set the color to clear the canvas (e.g., white)
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  // Get the clear button element
  const clearButton = document.getElementById("clearButton");

  // Add a click event listener to the clear button
  clearButton.addEventListener("click", clearCanvas);

  // Function to convert the color string to an array of RGBA values
  const getColorAsArray = (color) => {
    const rgba = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    return [
      parseInt(rgba[1], 16) / 255,
      parseInt(rgba[2], 16) / 255,
      parseInt(rgba[3], 16) / 255,
      1.0,
    ];
  };

  // Event to set active tool
  penButton.addEventListener("click", () => {
    currentTool = "pen";
    setActiveTool(penButton);
  });

  lineButton.addEventListener("click", () => {
    currentTool = "line";
    setActiveTool(lineButton);
  });

  squareButton.addEventListener("click", () => {
    currentTool = "square";
    setActiveTool(squareButton);
  });

  rectangleButton.addEventListener("click", () => {
    currentTool = "rectangle";
    setActiveTool(rectangleButton);
  });

  eraserButton.addEventListener("click", () => {
    currentTool = "eraser";
    setActiveTool(eraserButton);
  });

  // Function to set the active tool and update button styling
  const setActiveTool = (toolButton) => {
    const toolButtons = document.querySelectorAll(".tools button");
    toolButtons.forEach((button) => {
      if (button === toolButton) {
        button.classList.add("active-tool");
      } else {
        button.classList.remove("active-tool");
      }
    });
  };

  // Set first active tool to pen
  setActiveTool(penButton);
});
