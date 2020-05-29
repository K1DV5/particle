class Template {
    constructor() {
        this.point = document.querySelector('svg > circle')
        this.velocity = document.querySelector('svg > #velocity')
        this.negative = document.querySelector('svg > #negative')

        this.inMass = document.getElementById('mass')
        this.inSticky = document.getElementById('sticky')
        this.inVelocity = document.getElementById('velocity')
        this.inDirection = document.getElementById('direction')
        this.inCharge = document.getElementById('charge')

        this.inMass.addEventListener('input', () => this.updateMass())
        this.inSticky.addEventListener('input', () => this.updateSticky())
        this.inVelocity.addEventListener('input', () => this.updateVelocity())
        this.inDirection.addEventListener('input', () => this.updateVelocity())
        this.inCharge.addEventListener('input', () => this.updateCharge())

        this.updateMass()
        this.updateVelocity()
        this.updateCharge()
        this.updateSticky()
    }

    getColor(charge) {
        let absCharge = Math.abs(charge)
        let red = 5.1, green = 5.1  // 255 / 50 (50 is half of the input range)
        if (absCharge > 50) {
            red *= 50
            green *= absCharge - 50
        } else {
            red *= absCharge
            green *= 0
        }
        red = Math.round(red).toString(16)
        if (red.length == 1) red = '0' + red
        green = Math.round(green).toString(16)
        if (green.length == 1) green = '0' + green
        let blue = Math.round(255 - absCharge * 2.5).toString(16)
        if (blue.length == 1) blue = '0' + blue
        return '#' + red + green + blue
    }

    updateMass() {
        let r = this.inMass.value / 10
        this.point.setAttribute('r', r)
        this.negative.setAttribute('x1', 50 - r)
        this.negative.setAttribute('x2', 50 + r)
    }

    updateCharge() {
        let charge = Number(this.inCharge.value)
        let color = this.getColor(charge)
        this.point.setAttribute('fill', color)
        if (charge < 0) {
            this.negative.style.display = 'block'
        } else {
            this.negative.style.display = 'none'
        }
    }

    updateVelocity() {
        let angle = Math.PI * -this.inDirection.value / 180
        let x2 = this.inVelocity.value * Math.cos(angle) / 2 + 50
        let y2 = this.inVelocity.value * Math.sin(angle) / 2 + 50
        this.velocity.setAttribute('x2', x2)
        this.velocity.setAttribute('y2', y2)
    }

    updateSticky() {
        if (this.inSticky.checked) {
            this.point.setAttribute('stroke', 'cyan')
            this.velocity.style.display = 'none'
        } else {
            this.point.setAttribute('stroke', 'none')
            this.velocity.style.display = 'block'
        }
    }

    get() {
        let velocity = Number(this.inVelocity.value)
        let velocityX = null, velocityY = null
        if (!this.inSticky.checked) {
            let angle = Number(this.inDirection.value) * Math.PI / 180
            velocityX = velocity * Math.cos(angle)
            velocityY = - velocity * Math.sin(angle)  // y direction is down
        }
        return {
            mass: Number(this.inMass.value),
            charge: Number(this.inCharge.value),
            velocityX, velocityY,
            fill: this.point.getAttribute('fill'),
            stroke: this.point.getAttribute('stroke'),
            r: Number(this.point.getAttribute('r'))
        }
    }
}

class Point {
    constructor(x, y, props, xMax, yMax) {
        for (let [key, val] of Object.entries(props)) this[key] = val
        this.x = x, this.y = y
        this.xMax = xMax, this.yMax = yMax
        this.endX = null, this.endY = null  // if wall
    }

    draw(cx, duration) {
        cx.beginPath()
        cx.lineWidth = 2
        cx.fillStyle = this.fill
        if (this.endX === null) {
            this.wall()
            duration /= 1000
            this.x += this.velocityX * duration
            this.y += this.velocityY * duration
            cx.moveTo(this.x + this.r, this.y)
            cx.arc(this.x, this.y, this.r, 0, 2 * Math.PI) // circle
            cx.fill()
            if (this.stroke !== 'none') {
                cx.strokeStyle = this.stroke
                cx.stroke()
            }
            if (this.charge < 0) { // negative
                cx.beginPath()
                cx.strokeStyle = 'black'
                cx.moveTo(this.x + this.r, this.y)
                cx.lineTo(this.x - this.r, this.y)
                cx.stroke()
            }
        } else {  // is wall
            let angle = Math.atan2(this.endY - this.y, this.endX - this.x)
            let angle1 = Math.PI / 2 + angle, angle2 = Math.PI * 3 / 2 + angle
            let sinr = Math.sin(angle) * this.r, cosr = Math.cos(angle) * this.r
            cx.moveTo(this.x - sinr, this.y + cosr)
            cx.arc(this.x, this.y, this.r, angle1, angle2)
            cx.lineTo(this.endX + sinr, this.endY - cosr)
            cx.arc(this.endX, this.endY, this.r, Math.PI * 3 / 2 + angle, Math.PI / 2 + angle)
            cx.lineTo(this.x - sinr, this.y + cosr)
            cx.fill()
            cx.strokeStyle = this.stroke
            cx.stroke()
            if (this.charge < 0) { // negative
                cx.beginPath()
                cx.moveTo(this.x - cosr, this.y - sinr)
                cx.strokeStyle = 'black'
                cx.lineTo(this.endX + cosr, this.endY + sinr)
                cx.stroke()
            }
        }
    }

    wall(angle) {  // make sure to clear from the wall or wall like points
        if (angle === undefined) {  // outer walls
            if (this.x - this.r < 0) this.x = 0 + this.r
            if (this.x + this.r > this.xMax) this.x = this.xMax - this.r
            if (this.x - this.r === 0 && this.velocityX < 0 || this.x + this.r === this.xMax && this.velocityX > 0)
                this.velocityX *= -1
            if (this.y - this.r < 0) this.y = 0 + this.r
            if (this.y + this.r > this.yMax) this.y = this.yMax - this.r
            if (this.y - this.r === 0 && this.velocityY < 0 || this.y + this.r === this.yMax && this.velocityY > 0)
                this.velocityY *= -1
        } else {  // sticky points
            let direction = Math.atan2(this.velocityY, this.velocityX) - angle // relative
            let velocity = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
            let velocityX = -Math.cos(direction) * velocity, velocityY = Math.sin(direction) * velocity
            direction = Math.atan2(velocityY, velocityX) + angle // after
            this.velocityX = Math.cos(direction) * velocity, this.velocityY = Math.sin(direction) * velocity
        }
    }

    separate(other, angle, distance) {  // separate overlapping points
        let difference = this.r + other.r - distance
        if (other.velocityX === null) { // other is wall
            if (this.velocityX === null) return
            this.x -= difference * Math.cos(angle)
            this.y -= difference * Math.sin(angle)
        } else {
            other.x += difference * Math.cos(angle)
            other.y += difference * Math.sin(angle)
        }
    }

    dotDistAngle(x1, y1, x2, y2, addAngle) {  // distance and angle between two points, for use in getDistAngle
        let distance = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
        let angle = Math.atan2(y2 - y1, x2 - x1) + addAngle
        return [distance, angle]
    }

    getDistAngle(other) {
        let line, point, addAngle
        if (this.endX === null) { // this is point
            if (other.endX == null) return this.dotDistAngle(this.x, this.y, other.x, other.y, 0)
            line = other, point = this, addAngle = Math.PI // other is wall
        } else line = this, point = other, addAngle = 0  // this is wall
        let slopeLine = (line.endY - line.y) / (line.endX - line.x)
        let slopePoint = - 1 / slopeLine
        // check if point doesn't intersect the line
        let angleLine = Math.atan(slopeLine)
        let backwards = line.x <= line.endX || -1  // line is drawn backwards in x direction
        if (backwards * Math.cos(angleLine - Math.atan2(line.y - point.y, line.x - point.x)) > 0)
            return this.dotDistAngle(line.x, line.y, point.x, point.y, addAngle)
        if (backwards * Math.cos(angleLine - Math.atan2(point.y - line.endY, point.x - line.endX)) > 0)
            return this.dotDistAngle(line.endX, line.endY, point.x, point.y, addAngle)
        let absSlopeLine = Math.abs(slopeLine)
        if (absSlopeLine == Infinity) // vertical wall
            return [Math.abs(line.x - point.x), addAngle - (point.x < line.x ? Math.PI : 0)]
        if (absSlopeLine === 0) // horizontal wall
            return [Math.abs(line.y - point.y), addAngle - Math.PI * (point.y < line.y ? .5 : 1.5)]
        // line equations: y = mx + b
        let bLine = line.y - slopeLine * line.x
        let bPoint = point.y - slopePoint * point.x
        let intersX = (bPoint - bLine) / (slopeLine - slopePoint)
        let intersY = slopeLine * intersX + bLine
        let distance = Math.sqrt((point.y - intersY) ** 2 + (point.x - intersX) ** 2)
        let angle = Math.atan2(point.y - intersY, point.x - intersX) + addAngle
        return [distance, angle]
    }

    collide(other) {
        let [distance, angle] = this.getDistAngle(other)
        if (distance > this.r + other.r) return  // not in contact
        this.separate(other, angle, distance)  // prevent overlapping
        if (this.velocityX === null /*this is a wall*/) return other.velocityX !== null && other.wall(angle)
        if (other.velocityX === null /*other is wall*/) return this.wall(angle)  // other is wall
        // change the coordinate system to collision angle => y-axis is collision line
        let directionThis = Math.atan2(this.velocityY, this.velocityX) - angle // relative
        let directionOther = Math.atan2(other.velocityY, other.velocityX) - angle // relative
        let velocityThis = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
        let velocityXThis = Math.cos(directionThis) * velocityThis, velocityYThis = Math.sin(directionThis) * velocityThis
        let velocityOther = Math.sqrt(other.velocityX ** 2 + other.velocityY ** 2)
        let velocityXOther = Math.cos(directionOther) * velocityOther, velocityYOther = Math.sin(directionOther) * velocityOther
        // X MOMENTUM CONSERVED
        let momentum = this.mass * velocityXThis + other.mass * velocityXOther
        // taking e = 1, vb2 - va2 = va1 - vb1
        let deltaV = velocityXThis - velocityXOther
        velocityXThis = (momentum - other.mass * deltaV) / (this.mass + other.mass) // after
        velocityXOther = deltaV + velocityXThis // after
        // Y velocities same, no impact, proceed to after
        velocityThis = Math.sqrt(velocityXThis ** 2 + velocityYThis ** 2)
        directionThis = Math.atan2(velocityYThis, velocityXThis) + angle
        velocityOther = Math.sqrt(velocityXOther ** 2 + velocityYOther ** 2)
        directionOther = Math.atan2(velocityYOther, velocityXOther) + angle
        this.velocityX = Math.cos(directionThis) * velocityThis, this.velocityY = Math.sin(directionThis) * velocityThis
        other.velocityX = Math.cos(directionOther) * velocityOther, other.velocityY = Math.sin(directionOther) * velocityOther
    }

    attract(other) {
        let [distance, angle] = this.getDistAngle(other)
        // if (distance < this.r + other.r) return this.collide(other)
        if (distance < this.r + other.r) this.separate(other, angle, distance)  // prevent overlapping
        // if (Math.abs(this.x - other.x) * 6 < this.r + other.r || Math.abs(this.y - other.y) * 6 < this.r + other.r) return
        let force = 90 * this.charge * other.charge / distance ** 2
        // using coulomb's law, k=90
        let forceX = force * Math.cos(angle)
        let forceY = force * Math.sin(angle)
        if (this.velocityX !== null) {
            this.velocityX -= forceX / this.mass
            this.velocityY -= forceY / this.mass
        }
        if (other.velocityX !== null) {
            other.velocityX += forceX / other.mass
            other.velocityY += forceY / other.mass
        }
    }
}

class Collection {
    constructor() {
        this.points = []
        this.inmotion = false
        this.animate = this.animate.bind(this)
        this.template = new Template(document.getElementById('template'))
        let canvas = document.getElementById('main')
        window.addEventListener('resize', () => this.updateArea())
        canvas.addEventListener('click', event => event.shiftKey ? this.remove(event.layerX, event.layerY) : this.add(event.layerX, event.layerY, true))
        this.lastAdd = 0  // time of last add, to throttle
        this.wall = null  // for building walls
        canvas.addEventListener('mousemove', event => event.buttons === 1 && this.add(event.layerX, event.layerY, false))
        this.cx = canvas.getContext('2d')
        this.updateArea()
        this.lastTime = 0
        this.speedFactor = 1
        this.interact = 'collide'
    }

    updateTemp() {  // update temperature scale
        let temperature = this.points.reduce((temp, point) =>
            temp + Math.sqrt(point.velocityX ** 2 + point.velocityY ** 2) * point.mass, 0) / 10000
        this.cx.fillStyle = 'yellow'
        this.cx.fillText(temperature + ' \u00B0C', 2, 10)
    }

    updateArea() {
        this.cx.canvas.width = window.innerWidth - 30
        this.cx.canvas.height = 0.7 * window.innerHeight
        for (let point of this.points) {
            point.xMax = this.cx.canvas.width
            point.yMax = this.cx.canvas.height
        }
    }

    addDot(x, y, props) {  // add a point, not a wall
        let point = new Point(x, y, props, this.cx.canvas.width, this.cx.canvas.height)
        for (let other of this.points) point[this.interact](other)
        this.points.push(point)
        point.draw(this.cx, 0)
    }

    add(x, y, dot) {
        let props = this.template.get()
        if (dot) {
            if (this.wall) {  // end wall
                this.wall.endX = x, this.wall.endY = y
                this.animate(this.lastTime)
                this.wall = false
            } else this.addDot(x, y, props)
        } else if (props.velocityX === null) {
            if (this.wall) {  // continue wall
                this.wall.endX = x, this.wall.endY = y
                this.animate(this.lastTime)
            } else {  // start wall
                this.wall = new Point(x, y, { ...props, endX: x, endY: y }, this.cx.canvas.width, this.cx.canvas.height)
                this.points.push(this.wall)
                this.animate(this.lastTime)
            }
        } else {
            let now = Date.now()
            if (now - this.lastAdd < 150/*ms*/ && !dot) return  // throttle
            this.lastAdd = now
            this.addDot(x, y, props)
        }
    }

    remove(x, y) {
        let distances = []
        let anchor = new Point(x, y, {})
        for (let point of this.points) distances.push(anchor.getDistAngle(point)[0])
        let min = Math.min(...distances)
        if (min > 10) return // unreasonably far
        this.points.splice(distances.indexOf(min), 1) // remove nearest
        this.animate(this.lastTime)
    }

    animate(time) {
        this.cx.clearRect(0, 0, this.cx.canvas.width, this.cx.canvas.height)
        this.updateTemp()
        let length = this.points.length, iLast = length - 1
        for (let i = 0; i < iLast; i++) {
            let point = this.points[i]
            for (let j = i + 1; j < length; j++) point[this.interact](this.points[j])
        }
        let duration = time - this.lastTime
        duration = this.speedFactor * (duration < 50/*ms*/ ? duration : 16)
        for (let point of this.points) point.draw(this.cx, duration)
        this.lastTime = time
        if (this.inmotion && duration) requestAnimationFrame(this.animate)
    }

    speed(factor) { // start/stop/speed up/down
        if (factor === undefined) {  // start/stop
            if (this.inmotion) this.inmotion = false
            else {
                this.inmotion = true
                requestAnimationFrame(this.animate)
            }
        } else this.speedFactor *= factor // speed up/down
    }
}

let collection = new Collection()
document.querySelector('#startop').addEventListener('click', () => collection.speed())
window.addEventListener('keypress', event => event.key == ' ' && collection.speed())
document.querySelector('#faster').addEventListener('click', () => collection.speed(2))
document.querySelector('#slower').addEventListener('click', () => collection.speed(.5))
document.querySelector('#contact').addEventListener('click', event => {
    if (collection.interact === 'attract') {
        collection.interact = 'collide'
        event.target.innerText = 'By charge'
    } else {
        collection.interact = 'attract'
        event.target.innerText = 'By contact'
    }
})
