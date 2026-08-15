const Product = require('../models/Product');
const { uploadToBlob, deleteUploadedFile } = require('../middleware/uploadMiddleware');

const getProducts = async (req, res) => {
  try {
    const { category, search, sortBy, order, limit, offset } = req.query;

    const filters = { category, search };
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const products = await Product.findAll({
      ...filters,
      sortBy,
      order,
      limit: parsedLimit,
      offset: parsedOffset
    });
    const total = await Product.count(filters);

    res.json({
      products,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + products.length < total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Product.getCategories();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { title, description, price, category, imageUrl, stock } = req.body;

    if (!title || !price) {
      return res.status(400).json({ message: 'Title and price are required fields' });
    }

    // req.file is now an in-memory buffer (multer.memoryStorage), not a
    // file already sitting on disk — it has to be uploaded to Blob before
    // we have a URL worth saving.
    const finalImageUrl = req.file ? await uploadToBlob(req.file) : (imageUrl || null);

    const newProduct = await Product.create({
      title,
      description,
      price,
      category,
      imageUrl: finalImageUrl,
      stock: stock ?? 0
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category, imageUrl, stock } = req.body;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newImageUrl = req.file ? await uploadToBlob(req.file) : (imageUrl ?? existingProduct.image_url);

    const updatedProduct = await Product.update(id, {
      title: title ?? existingProduct.title,
      description: description ?? existingProduct.description,
      price: price ?? existingProduct.price,
      category: category ?? existingProduct.category,
      imageUrl: newImageUrl,
      stock: stock ?? existingProduct.stock
    });

    if (req.file && existingProduct.image_url !== newImageUrl) {
      await deleteUploadedFile(existingProduct.image_url);
    }

    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await Product.delete(id);
    await deleteUploadedFile(existingProduct.image_url);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct
};