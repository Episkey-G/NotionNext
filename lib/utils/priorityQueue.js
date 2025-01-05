export class PriorityQueue {
  constructor(comparator = (a, b) => a < b) {
    this.heap = []
    this.comparator = comparator
  }

  push(element) {
    this.heap.push(element)
    this._siftUp(this.heap.length - 1)
  }

  pop() {
    if (this.isEmpty()) return null
    const result = this.heap[0]
    const last = this.heap.pop()
    if (this.heap.length > 0) {
      this.heap[0] = last
      this._siftDown(0)
    }
    return result
  }

  peek() {
    return this.isEmpty() ? null : this.heap[0]
  }

  isEmpty() {
    return this.heap.length === 0
  }

  _siftUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2)
      if (this.comparator(this.heap[index], this.heap[parentIndex])) {
        [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]]
        index = parentIndex
      } else {
        break
      }
    }
  }

  _siftDown(index) {
    while (true) {
      let minIndex = index
      const leftChild = 2 * index + 1
      const rightChild = 2 * index + 2

      if (leftChild < this.heap.length && this.comparator(this.heap[leftChild], this.heap[minIndex])) {
        minIndex = leftChild
      }
      if (rightChild < this.heap.length && this.comparator(this.heap[rightChild], this.heap[minIndex])) {
        minIndex = rightChild
      }

      if (minIndex !== index) {
        [this.heap[index], this.heap[minIndex]] = [this.heap[minIndex], this.heap[index]]
        index = minIndex
      } else {
        break
      }
    }
  }
} 