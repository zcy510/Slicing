const bedWidth = 150.0;
const extrudeWidth = 0.71;
const supportInfill = .5;
const delta = extrudeWidth/100.0;

class Point {
    constructor(x_, y_, z_) {
        this.x = x_;
        this.y = y_;
        this.z = z_;
    }
    dotProduct(p) {
        return this.x*p.x + this.y*p.y + this.z*p.z;
    }
    normalize() {
        return Math.sqrt(this.x**2 + this.y**2 + this.z**2);
    }
    toString() {
        return "Point("+this.x+","+this.y+","+this.z+")";
    }
    equals(p2) {
        if (close(this.x,p2.x) && close(this.y,p2.y) && close(this.z,p2.z)) {
            return true;
        } else {
            return false;
        }
    }
}

function close(f1,f2) {
    const comp = (Math.max(f1,f2) - Math.min(f1,f2));
    return (comp > -delta) && (comp < delta);
}

class Line {
    constructor(p0_, p1_) {
        this.p0 = p0_;
        this.p1 = p1_;
    }
    toString() {
        return "Line("+this.p0.toString()+","+this.p1.toString()+")";
    }
    reverse() {
        const x_ = this.p0.x;
        const y_ = this.p0.y;
        const z_ = this.p0.z;
        this.p0.x = this.p1.x;
        this.p0.y = this.p1.y;
        this.p0.z = this.p1.z;
        this.p1.x = x_;
        this.p1.y = y_;
        this.p1.z = z_;
        return this;
    }
}

function lineEqual(L1,L2) {
    if ((close(L1.p0.x, L2.p0.x) && close(L1.p0.y, L2.p0.y)
     && close(L1.p1.x, L2.p1.x) && close(L1.p1.y, L2.p1.y)) 
    || (close(L1.p0.x, L2.p1.x) && close(L1.p0.y, L2.p1.y) 
     && close(L1.p1.x, L2.p0.x) && close(L1.p1.y, L2.p0.y))) {
        return true;
    } else {
        return false;
    }
}

class Triangle {
    constructor(p0_, p1_, p2_, norm_) {
        this.p0 = new Point(p0_.x, p0_.y, p0_.z);
        this.p1 = new Point(p1_.x, p1_.y, p1_.z);
        this.p2 = new Point(p2_.x, p2_.y, p2_.z);
        this.norm = norm_;
    }
    toString() {
        return "Triangle("+this.p0.toString()+","+this.p1.toString()+","+this.p2.toString()+")";
    }
}

function triangleEqual(T1,T2) {
    if ((T1.p0.equals(T2.p0) && T1.p1.equals(T2.p1) && T1.p2.equals(T2.p2))
        || (T1.p0.equals(T2.p0) && T1.p1.equals(T2.p2) && T1.p2.equals(T2.p1))
        || (T1.p0.equals(T2.p1) && T1.p1.equals(T2.p0) && T1.p2.equals(T2.p2))
        || (T1.p0.equals(T2.p1) && T1.p1.equals(T2.p2) && T1.p2.equals(T2.p0))
        || (T1.p0.equals(T2.p2) && T1.p1.equals(T2.p0) && T1.p2.equals(T2.p1))
        || (T1.p0.equals(T2.p2) && T1.p1.equals(T2.p1) && T1.p2.equals(T2.p0))) {
        return true;
    } else {
        return false;
    }
}

class Slice {
    constructor(zValue_, perimeter_, isSurface_) {
        this.zValue = zValue_;
        this.perimeter = perimeter_;
        this.isSurface = isSurface_;
        this.support = [];
        this.infill = [];
    }
}

function fileToTriangles(data) {
    const lines = data.split('\n');
    lines.shift();
    let counter = 0;
    const triangles = [];
    const points = [];

    for (let i = 0; i < lines.length; i++) {
        const l_ = lines[i].split(" ");
        const l = l_.filter(value => value !== '');
        if (counter === 6) {
            counter = 0;
            continue;
        } else if (counter === 0 && l[0] === 'endsolid') {
            break;
        } else if ([0, 2, 3, 4].includes(counter)) {
            const index = counter === 0 ? 2 : 1;
            points.unshift(new Point(parseFloat(l[index]), parseFloat(l[index + 1]), parseFloat(l[index + 2].replace('\r/g', ''))));
        }
        counter++;
    }
    while (points.length >= 4) {
        // 确保points数组中有足够的点来形成一个三角形和法线
        triangles.unshift(new Triangle(points[2], points[1], points[0], points[3]));
        points.splice(0, 4);
    }
    return triangles;
}


function intersectSlice(line, plane) {
    if (line.p0.z === line.p1.z && line.p1.z === plane) {
        return line.p0;
    } else if (line.p0.z === line.p1.z) {
        return null;
    } else {
        const slope = new Point(line.p1.x-line.p0.x, line.p1.y-line.p0.y, line.p1.z-line.p0.z);
        const t = (plane-line.p0.z)/slope.z;
        if (t >= 0 && t <= 1) {
            const testZ = line.p0.z+t*slope.z;
            if (testZ <= Math.max(line.p0.z, line.p1.z) && testZ >= Math.min(line.p0.z, line.p1.z)) {
                const testP = new Point(line.p0.x+t*slope.x, line.p0.y+t*slope.y, line.p0.z+t*slope.z);
                return testP;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
}

function sign(p1, p2, p3) {
    return (p1.x-p3.x)*(p2.y-p3.y) - (p2.x-p3.x)*(p1.y-p3.y);
}

function aboveTriangle(point,triangle) {
    if  (point.z > (triangle.p0.z-delta) &&
        point.z > (triangle.p1.z-delta) &&
        point.z > (triangle.p2.z-delta)) {
        const b1 = (sign(point, triangle.p0, triangle.p1) < 0.0);
        const b2 = (sign(point, triangle.p1, triangle.p2) < 0.0);
        const b3 = (sign(point, triangle.p2, triangle.p0) < 0.0);
        const ret = ((b1 === b2) && (b2 === b3));
        return ret;
    } else {
        return false;
    }
}

function findBoundaries(triangles) {
    let bottomZ = 500;
    let topZ = -500;
    for (let i = 0; i < triangles.length; i++) {
        const triangle = triangles[i];
        const maximum = Math.max(triangle.p0.z, triangle.p1.z, triangle.p2.z);
        const minimum = Math.min(triangle.p0.z, triangle.p1.z, triangle.p2.z);
        if (maximum > topZ) {
            topZ = maximum;
        }
        if (minimum < bottomZ) {
            bottomZ = minimum;
        }
    }
    return [bottomZ, topZ];
}

function separateSlices(triangles, layerThickness) {
    const bounds = findBoundaries(triangles);
    const numSlices = Math.floor((bounds[1]-bounds[0])/layerThickness);
    const slices = [];
    const segments = [];
    for (let z = 0; z <= numSlices; z++) {
        const s = bounds[0]+z*layerThickness;
        const currentSegment = [];
        let currentSegmentSurface = false;
        for (let i = 0; i < triangles.length; i++) {
            const triangle = triangles[i];
            const point1 = intersectSlice(new Line(triangle.p0, triangle.p1), s);
            const point2 = intersectSlice(new Line(triangle.p1, triangle.p2), s);
            const point3 = intersectSlice(new Line(triangle.p2, triangle.p0), s);
            const points_ = Array.from(new Set([point1, point2, point3]));
            const points = [];
            for (let i = 0; i < points_.length; i++) {
                const point = points_[i];
                if (point !== null) {
                    points_.splice(points_.indexOf(null), 1);
                    break;
                }
            }
            for (let i = 0; i < points_.length; i++) {
                let j = i+1;
                let unique = true;
                while (j < points_.length) {
                    if (points_[i].equals(points_[j])) {
                        unique = false;
                    }
                    j++;
                }
                if (unique) {
                    points.unshift(JSON.parse(JSON.stringify(points_[i])));
                }
            }
            if (s <= (bounds[0]+layerThickness) || s >= (bounds[1]-layerThickness)) {
                currentSegmentSurface = true;
            }
            if (points.length === 2) {
                currentSegment.push(new Line(points[0], points[1]));
            } else if (points.length === 3) {
                const segment1 = new Line(points[0], points[1]);
                const segment2 = new Line(points[1], points[2]);
                const segment3 = new Line(points[2], points[0]);
                currentSegmentSurface = true;
                currentSegment.push(segment1);
                currentSegment.push(segment2);
                currentSegment.push(segment3);
            }
        }
        segments.push(new Slice(s, JSON.parse(JSON.stringify(currentSegment)), currentSegmentSurface));
    }
    return segments;
}

function intersection(L1,L2) {
    const x1 = L1.p0.x;
    const y1 = L1.p0.y;
    const x2 = L1.p1.x;
    const y2 = L1.p1.y;
    const x3 = L2.p0.x;
    const y3 = L2.p0.y;
    const x4 = L2.p1.x;
    const y4 = L2.p1.y;
    const xnum = (x1*y2-y1*x2)*(x3-x4) - (x1-x2)*(x3*y4-y3*x4);
    const xden = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    const ynum = (x1*y2-y1*x2)*(y3-y4) - (y1-y2)*(x3*y4-y3*x4);
    const yden = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4);
    try {
        const intersect = new Point(xnum/xden,ynum/yden,L1.p0.z);
        if ((intersect.x >= Math.min(x1,x2)-delta) && (intersect.x <= Math.max(x1,x2)+delta) &&
            (intersect.y >= Math.min(y1,y2)-delta) && (intersect.y <= Math.max(y1,y2)+delta) &&
            (intersect.x >= Math.min(x3,x4)-delta) && (intersect.x <= Math.max(x3,x4)+delta) &&
            (intersect.y >= Math.min(y3,y4)-delta) && (intersect.y <= Math.max(y3,y4)+delta)) {
            return intersect;
        } else {
            return null;
        }
    } catch {
        return null;
    }
}

function Infill(perimeter,percent) {
    //assert(percent >= 0);
    //assert(percent <= 1);
    if (perimeter.length === 0) {
        return [];
    }
    const Z = perimeter[0].p0.z;
    const numLines = Math.round((bedWidth*percent)/extrudeWidth);
    const gap = bedWidth/numLines;
    const infill = [];
    for (let x = 0; x < numLines; x++) {
        const fullLine = new Line(new Point((bedWidth/-2)+(x*gap),bedWidth/-2,Z),new Point((bedWidth/-2)+(x*gap),bedWidth/2,Z));
        const inters = [];
        for (let i = 0; i < perimeter.length; i++) {
            const line = perimeter[i];
            const sect = intersection(line,fullLine);
            if (sect !== null) {
                let newLine = true;
                for (let i = 0; i < inters.length; i++) {
                    if (close(inters[i].y,sect.y)) {
                        newLine = false;
                    }
                }
                if (newLine) {
                    inters.unshift(JSON.parse(JSON.stringify(sect)));
                }
            }
        }
        inters.sort((a, b) => a.y - b.y);
        if (inters.length%2 === 0) {
            for (let i = 0; i < inters.length; i++) {
                if (i%2 !== 0) {
                    let overlap = false;
                    const newLine = new Line(inters[i-1],inters[i]);
                    for (let i = 0; i < perimeter.length; i++) {
                        if (lineEqual(perimeter[i],newLine)) {
                            overlap = true;
                        }
                    }
                    if (!overlap) {
                        infill.push(newLine);
                    }
                }
            }
        }
    }
    return infill;
}

function findNextPoint(point, lines) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pointInLine(point, line)) {
            return i;
        }
    }
    return null;
}

function cleanPerimeter(s) {
    const setPerimeter = JSON.parse(JSON.stringify(s.perimeter));
    let i = 0;
    while (i < setPerimeter.length) {
        let j = i+1;
        while (j < setPerimeter.length) {
            if (lineEqual(setPerimeter[i],setPerimeter[j])) {
                setPerimeter.splice(j, 1);
            } else {
                j++;
            }
        }
        i++;
    }
    const finalPerimeter = setPerimeter;
    return new Slice(s.zValue, finalPerimeter, s.isSurface);
}

function brim(base, numOutlines, offset) {
    let cx = 0;
    let cy = 0;
    let area = 1;
    for (let i = 0; i < base.length; i++) {
        const line = base[i];
        cx = cx + (line.p0.x + line.p1.x);
        cy = cy + (line.p0.y + line.p1.y);
        area += (line.p0.x * line.p1.y - line.p1.x * line.p0.y);
    }
    area = area / 2;
    cx = cx / (6 * area);
    cy = cy / (6 * area);
    const brimlines = [];
    for (let i = 1; i <= numOutlines; i++) {
        for (let j = 0; j < base.length; j++) {
            const line = base[j];
            const line_ = new Line(new Point(line.p0.x, line.p0.y, line.p0.z), new Point(line.p1.x, line.p1.y, line.p1.z));
            if (line.p0.x > cx) {
                line_.p0.x += offset + extrudeWidth * i;
            } else {
                line_.p0.x -= offset + extrudeWidth * i;
            }
            if (line.p0.y > cy) {
                line_.p0.y += offset + extrudeWidth * i;
            } else {
                line_.p0.y -= offset + extrudeWidth * i;
            }
            if (line.p1.x > cx) {
                line_.p1.x += offset + extrudeWidth * i;
            } else {
                line_.p1.x -= offset + extrudeWidth * i;
            }
            if (line.p1.y > cy) {
                line_.p1.y += offset + extrudeWidth * i;
            } else {
                line_.p1.y -= offset + extrudeWidth * i;
            }
            brimlines.push(line_);
        }
    }
    return brimlines;
}

function raft(slices, numLayers, offset, infill, layerThickness) {
    let x = 0;
    let y = 0;
    let x_ = 0;
    let y_ = 0;
    for (let i = 0; i < slices.length; i++) {
        const s = slices[i];
        for (let j = 0; j < s.perimeter.length; j++) {
            const line = s.perimeter[j];
            if (line.p0.x > x || line.p1.x > x) {
                x = line.p0.x > line.p1.x ? line.p0.x : line.p1.x;
            }
            if (line.p0.x < x_ || line.p1.x < x_) {
                x_ = line.p0.x < line.p1.x ? line.p0.x : line.p1.x;
            }
            if (line.p0.y > y || line.p1.y > y) {
                y = line.p0.y > line.p1.y ? line.p0.y : line.p1.y;
            }
            if (line.p0.y < y_ || line.p1.y < y_) {
                y_ = line.p0.y < line.p1.y ? line.p0.y : line.p1.y;
            }
        }
    }
    x += offset;
    y += offset;
    x_ -= offset;
    y_ -= offset;
    const xlen = x - x_;
    const ylen = y - y_;
    const area  =  xlen * ylen;
    const totalArea = area * infill;
    const xlines = Math.floor(totalArea / (extrudeWidth * xlen));
    const xgap = (ylen - extrudeWidth * xlines) / xlines;
    const ylines = Math.floor(totalArea / (extrudeWidth * ylen));
    const ygap = (xlen - extrudeWidth * ylines) / ylines;
    let i = 0;
    let z = slices[0].zValue;
    const allSegments = [];
    let lines = [];
    let switch_ = true;
    while (i < numLayers) {
        if (numLayers - i <= 1) {
            const lines_ = [new Line(new Point(x_,y_,z),new Point(x_,y,z)), new Line(new Point(x_,y,z),new Point(x,y,z)), new Line(new Point(x,y,z),new Point(x,y_,z)), new Line(new Point(x,y_,z),new Point(x_,y_,z))];
            lines = lines.concat(lines_);
            lines = lines.concat(Infill(lines_, 1.0));
        } else if (i % 2 === 1) {
            for (let k = 0; k < xlines; k++) {
                if (switch_ === true) {
                    lines = lines.concat([new Line(new Point(x_,y_+ygap * k,z),new Point(x,y_+ygap * k,z)), new Line(new Point(x,y_+ygap * k,z),new Point(x,y_+ygap*(k+1),z))]);
                    switch_ = false;
                } else {
                    lines = lines.concat([new Line(new Point(x,y_+ygap * k,z),new Point(x_,y_+ygap* k,z)), new Line(new Point(x_,y_+ygap *k,z), new Point(x_,y_+ygap * (k+1), z))]);
                    switch_ = true;
                }
            }
        } else if (i % 2 === 0) {
            for (let k = 0; k < xlines; k++) {
                if (switch_ === true) {
                    lines = lines.concat([new Line(new Point(x-xgap * k, y_,z),new Point(x-xgap * k, y, z)), new Line(new Point(x-xgap * k,y,z),new Point(x-xgap * (k-1),y,z))]);
                    switch_ = false;
                } else {
                    lines = lines.concat([new Line(new Point(x-xgap * k,y,z),new Point(x-xgap * k,y_,z)), new Line(new Point(x-xgap * k,y_,z),new Point(x-xgap * (k+1),y_,z))]);
                    switch_ = true;
                }
            }
        }
        allSegments.push(lines);
        switch_ = true;
        z += layerThickness;
    }
    return allSegments;
}

function downward(triangles) {
    const trianglesDown = [];
    for (let i = 0; i < triangles.length; i++) {
        const triangle = triangles[i];
        if (triangle.norm.z < 0) {
            trianglesDown.unshift(JSON.parse(JSON.stringify(triangle)));
        }
    }
    return trianglesDown;
}


function supportNeeded(triangle, triangles, bottomZ) {
    if (close(triangle.p0.z, bottomZ)
        && close(triangle.p1.z, bottomZ)
        && close(triangle.p2.z, bottomZ)) {
        return false;
    }
    for (let tri of triangles) {
        if (aboveTriangle(triangle.p0, tri) 
            || aboveTriangle(triangle.p1, tri) 
            || aboveTriangle(triangle.p2, tri)) {
            return false;
        }
    }
    return true;
}

function generateSupportShape(triangle, bottomZ) {
    let tmp=JSON.parse(JSON.stringify(triangle));
    let triangleTop = new Triangle(new Point(tmp.p0.x, tmp.p0.y, tmp.p0.z),
    new Point(tmp.p1.x, tmp.p1.y, tmp.p1.z),
    new Point(tmp.p2.x, tmp.p2.y, tmp.p2.z),

    );
    let triangleBottom = new Triangle(new Point(triangleTop.p0.x, triangleTop.p0.y, bottomZ), 
                                      new Point(triangleTop.p1.x, triangleTop.p1.y, bottomZ), 
                                      new Point(triangleTop.p2.x, triangleTop.p2.y, bottomZ), null);
    let newShape = [triangleTop];
    newShape.push(triangleBottom);
    newShape.push(new Triangle(triangleTop.p0, triangleTop.p1, triangleBottom.p0, null));
    newShape.push(new Triangle(triangleTop.p1, triangleTop.p2, triangleBottom.p1, null));
    newShape.push(new Triangle(triangleTop.p2, triangleTop.p0, triangleBottom.p2, null));
    newShape.push(new Triangle(triangleBottom.p0, triangleBottom.p1, triangleTop.p1, null));
    newShape.push(new Triangle(triangleBottom.p1, triangleBottom.p2, triangleTop.p2, null));
    newShape.push(new Triangle(triangleBottom.p2, triangleBottom.p0, triangleTop.p0, null));
    let i = 0;
    while (i < newShape.length) {
        let j = i + 1;
        while (j < newShape.length) {
            if (triangleEqual(newShape[i], newShape[j])) {
                newShape.splice(j, 1);
            } else {
                j++;
            }
        }
        i++;
    }
    return newShape;
}

function generateSupports(triangles, layerThickness) {
    let bounds = findBoundaries(triangles);
    let trianglesDown = downward(triangles);
    let trianglesForSupport = [];
    for (let tri of trianglesDown) {
        if (supportNeeded(tri, triangles, bounds[0])) {
            trianglesForSupport.unshift(JSON.parse(JSON.stringify(tri)));
        }
    }
    let supportShapes = [];
    for (let triangle of trianglesForSupport) {
        supportShapes.unshift(generateSupportShape(triangle, bounds[0]));
    }
    let supportSlices = [];
    for (let shape of supportShapes) {
        supportSlices.unshift(separateSlices(shape, layerThickness));
    }
    return supportSlices;
}



function writeGcode(slices, filename) {
    var scene = new THREE.Scene();
    let extrudeRate = 0.05;
    let gcode = "";

    gcode += ";Start GCode\n";
    gcode += "M109 S210.000000\n";
    gcode += "G28 X0 Y0 Z0\n";
    gcode += "G92 E0\n";

    let o = bedWidth / 2; // 确保你已经定义了bedWidth变量
    let layer = 1;
    let E = 0;
    for (let s of slices) {
        gcode += `;Layer ${layer} of ${slices.length}\n`;

        if (layer === 2) {
            gcode += "M106 S127\n";
        }
        if (layer === 3) {
            gcode += "M106 S255\n";
        }
        gcode += ";perimeter\n";
        var material1 = new THREE.LineBasicMaterial({color: 0x0000ff});
        for (let l of s.perimeter) {
            gcode += `G0 X${o + l.p0.x} Y${o + l.p0.y} Z${l.p0.z} F2700\n`;

            let dist = Math.sqrt(Math.pow(l.p1.x - l.p0.x, 2) + Math.pow(l.p1.y - l.p0.y, 2));
            E += dist * extrudeRate;
            gcode += `G1 X${o + l.p1.x} Y${o + l.p1.y} E${E} F900\n`;
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(o + l.p0.x, o + l.p0.y, l.p0.z));
            geometry.vertices.push(new THREE.Vector3(o + l.p1.x, o + l.p1.y, l.p0.z));
            var line = new THREE.Line(geometry, material1);
            scene.add(line);
        }
        // 同样的逻辑应用于support和infill

        if (s.support.length>0)
        {
            gcode += ';support\n';
        }
        var material2 = new THREE.LineBasicMaterial({color: 0x00ff00});
        for( let l of s.support)
        {
            gcode += `G0 X${o + l.p0.x} Y${o + l.p0.y} Z${l.p0.z} F2700\n`;
            let dist = Math.sqrt(Math.pow(l.p1.x - l.p0.x, 2) + Math.pow(l.p1.y - l.p0.y, 2));
            E += dist * extrudeRate;
            gcode += `G1 X${o + l.p1.x} Y${o + l.p1.y} E${E} F800\n`;
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(o + l.p0.x, o + l.p0.y, l.p0.z));
            geometry.vertices.push(new THREE.Vector3(o + l.p1.x, o + l.p1.y, l.p0.z));
            var line = new THREE.Line(geometry, material2);
            scene.add(line);
        }

        if(s.infill.length>0)
        {
            gcode += ';infill\n';
        }
        var material3 = new THREE.LineBasicMaterial({color: 0xff0000});
        for(let l of s.infill)
        {
            gcode += `G0 X${o + l.p0.x} Y${o + l.p0.y} Z${l.p0.z} F2700\n`;
            let dist = Math.sqrt(Math.pow(l.p1.x - l.p0.x, 2) + Math.pow(l.p1.y - l.p0.y, 2));
            E += dist * extrudeRate;
            gcode += `G1 X${o + l.p1.x} Y${o + l.p1.y} E${E} F900\n`;
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(o + l.p0.x, o + l.p0.y, l.p0.z));
            geometry.vertices.push(new THREE.Vector3(o + l.p1.x, o + l.p1.y, l.p0.z));
            var line = new THREE.Line(geometry, material3);
            scene.add(line);
        }
        layer++;
    }

    gcode += ";End GCode\n";
    gcode += "M104 S0\n";
    gcode += "M140 S0\n";
    gcode += "G91\n";
    gcode += "G1 E-1 F300\n";
    gcode += "G1 Z+0.5 E-5 X-20 Y-20 F2700\n";
    gcode += "G28 X0 Y0\n";
    gcode += "M84\n";
    gcode += "G90\n";

    downloadFile(gcode, filename.slice(0, -3) + "gcode");
    //return scene;
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // 需要添加到页面中以避免某些浏览器的限制
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


function slicing(fn, lt, infill) {
    let filename = fn;
    let layerThickness = lt;
    let infillPercent = infill;
    let triangles = fileToTriangles(filename);
    let slices_ = separateSlices(triangles, layerThickness);
    let supportSlices = generateSupports(triangles, layerThickness);
    let slices = [];
    for (let s of slices_) {
        slices.push(cleanPerimeter(s));
    }
    for (let s of slices) {
        if (s.isSurface) {
            s.infill = Infill(s.perimeter, 1);
        } else {
            s.infill = Infill(s.perimeter, infillPercent);
        }
    }
    for (let shape of supportSlices) {
        for (let s = 0; s < shape.length; s++) {
            slices[s].support = slices[s].support.concat(Infill(shape[s].perimeter, supportInfill));
        }
    }
    writeGcode(slices, filename);
    

}
