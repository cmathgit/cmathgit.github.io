import math
import os
import json

def load_vector_from_json(filepath, label):
    """
    Helper function to load an Ollama embedding JSON file into a Vector object.
    Expects format: {"model": "...", "embeddings": [[val1, val2, ...]], "total_duration": ..., "load_duration": ..., "prompt_eval_count": ...}
    """
    with open(filepath, 'r') as f:
        data = json.load(f)
        # Extract the list from the first embedding response
        vector_data = data['embeddings'][0] 
        return Vector(vector_data, label=label)

class Vector:
    """
    A mathematical representation of a high-dimensional vector, commonly used 
    in distributional semantics (e.g., Word2Vec, GloVe, Transformer embeddings).
    """
    def __init__(self, components, label="Vector"):
        self.components = components
        self.label = label
        self.dimensions = len(components)

    def __add__(self, other):
        """Vector Addition: v1 + v2"""
        if self.dimensions != other.dimensions:
            raise ValueError("Vectors must have the same dimensions to be added.")
        new_components = [a + b for a, b in zip(self.components, other.components)]
        return Vector(new_components, label=f"({self.label} + {other.label})")

    def __sub__(self, other):
        """Vector Subtraction: v1 - v2"""
        if self.dimensions != other.dimensions:
            raise ValueError("Vectors must have the same dimensions to be subtracted.")
        new_components = [a - b for a, b in zip(self.components, other.components)]
        return Vector(new_components, label=f"({self.label} - {other.label})")

    def magnitude(self):
        """Calculates the Euclidean norm (length) of the vector."""
        return math.sqrt(sum(x**2 for x in self.components))

    # ==========================================
    # SIMILARITY & DISTANCE METRICS
    # ==========================================

    def dot_product(self, other):
        """
        Dot Product (Inner Product)
        Calculates the sum of the products of the corresponding entries.
        Higher values indicate higher similarity, but it is unbounded and affected by vector magnitude.
        Formula: sum(A_i * B_i)
        """
        if self.dimensions != other.dimensions:
            raise ValueError("Vectors must have the same dimensions for Dot Product.")
        return sum(a * b for a, b in zip(self.components, other.components))

    def cosine_similarity(self, other):
        """
        Cosine Similarity
        Calculates the cosine of the angle between two vectors. 
        It is magnitude-invariant, making it the standard for NLP embeddings.
        Range: [-1.0, 1.0]. 1.0 means identical direction.
        Formula: (A dot B) / (||A|| * ||B||)
        """
        dot = self.dot_product(other)
        mag_self = self.magnitude()
        mag_other = other.magnitude()
        
        if mag_self == 0 or mag_other == 0:
            return 0.0 # Prevent division by zero
            
        return dot / (mag_self * mag_other)

    def euclidean_distance(self, other):
        """
        Euclidean Distance (L2 Distance)
        Calculates the straight-line distance between two points in Euclidean space.
        Lower values indicate the vectors are closer together.
        Formula: sqrt(sum((A_i - B_i)^2))
        """
        if self.dimensions != other.dimensions:
            raise ValueError("Vectors must have the same dimensions for Euclidean Distance.")
        return math.sqrt(sum((a - b)**2 for a, b in zip(self.components, other.components)))

    def manhattan_distance(self, other):
        """
        Manhattan Distance (L1 Distance / Taxicab Geometry)
        Calculates the distance between two points measured along axes at right angles.
        Lower values indicate the vectors are closer together.
        Formula: sum(|A_i - B_i|)
        """
        if self.dimensions != other.dimensions:
            raise ValueError("Vectors must have the same dimensions for Manhattan Distance.")
        return sum(abs(a - b) for a, b in zip(self.components, other.components))


if __name__ == "__main__":
    '''Example Embedding Analysis'''
    # 1. Initialize the embedding weights (using a truncated 10-dimensional subset for academic clarity)
    # In a production environment, these would be the full 150-to-12288 dimension vectors.
    v_king  = Vector([0.0, -0.0, -0.0, -0.0, 0.0, -0.1, -0.0, -0.0, -0.0, 0.0], label="King")
    v_man   = Vector([-0.0, -0.0, -0.0, -0.0, -0.0, -0.0, -0.0, -0.0, -0.0, 0.0], label="Man")
    v_woman = Vector([-0.0, 0.0, -0.0, 0.0, -0.0, -0.0, -0.0, -0.0, 0.0, 0.0], label="Woman")
    v_queen = Vector([0.0, 0.0, -0.0, -0.0, -0.0, -0.1, -0.0, -0.0, -0.0, 0.0], label="Queen")

    print("-" * 50)
    print("EXAMPLE EMBEDDING VECTOR MATH: COMPARATIVE METRICS")
    print("-" * 50)

    # 2. Perform the arithmetic operation
    print("Executing Equation: King - Man + Woman")
    v_calculated = v_king - v_man + v_woman
    
    print(f"\nCalculated Vector (First 10 dims): {v_calculated.components}")
    print(f"Target 'Queen' Vector (First 10 dims): {v_queen.components}")
    
    # 3. Compute and display all similarity and distance metrics
    print("\n" + "=" * 50)
    print("EXAMPLE METRIC ANALYSIS: Calculated Vector vs. Target 'Queen'")
    print("=" * 50)

    # Cosine Similarity (Angular)
    cos_sim = v_calculated.cosine_similarity(v_queen)
    print(f"1. Cosine Similarity:     {cos_sim:.6f}")
    print("   (Range [-1, 1]. Values approaching 1.0 indicate parallel trajectory in semantic space.)\n")

    # Dot Product (Magnitude-Dependent)
    dot_prod = v_calculated.dot_product(v_queen)
    print(f"2. Dot Product (Inner):   {dot_prod:.6f}")
    print("   (Unbounded. Influenced by both angle and the length/magnitude of the vectors.)\n")

    # Euclidean Distance (L2)
    euclidean = v_calculated.euclidean_distance(v_queen)
    print(f"3. Euclidean Dist (L2):   {euclidean:.6f}")
    print("   (Straight-line spatial distance. Lower values indicate proximity.)\n")

    # Manhattan Distance (L1)
    manhattan = v_calculated.manhattan_distance(v_queen)
    print(f"4. Manhattan Dist (L1):   {manhattan:.6f}")
    print("   (Grid-based/Taxicab distance. Lower values indicate proximity across dimensions.)")
    print("=" * 50)
    
    print("\n" + "*" * 50)
    print("OLLAMA API EMBEDDINGS (e.g., Qwen3, Granite, Gemma)")
    print("*" * 50)
    
    # Directory where students should save their Postman JSON responses
    embed_dir = "embeddings/granite"
    
    try:
        # Load the actual embedding weights generated via Ollama 
        v_ollama_king  = load_vector_from_json(os.path.join(embed_dir, "king.json"), "King")
        v_ollama_man   = load_vector_from_json(os.path.join(embed_dir, "man.json"), "Man")
        v_ollama_woman = load_vector_from_json(os.path.join(embed_dir, "woman.json"), "Woman")
        v_ollama_queen = load_vector_from_json(os.path.join(embed_dir, "queen.json"), "Queen")
        v_ollama_christ = load_vector_from_json(os.path.join(embed_dir, "christ.json"), "Christ")
        v_ollama_god = load_vector_from_json(os.path.join(embed_dir, "god.json"), "God")

        # Load the high-fidelity vectors
        v_ollama_father = load_vector_from_json(os.path.join(embed_dir, "father.json"), "Father")
        v_ollama_son = load_vector_from_json(os.path.join(embed_dir, "son.json"), "Son")
        v_ollama_jesus = load_vector_from_json(os.path.join(embed_dir, "jesus.json"), "Jesus")
        v_ollama_savior = load_vector_from_json(os.path.join(embed_dir, "savior.json"), "Savior")
        v_ollama_anointed = load_vector_from_json(os.path.join(embed_dir, "anointed.json"), "Anointed")
        
        print(f"Successfully loaded {v_ollama_king.dimensions}-dimensional vectors from '{embed_dir}/'!\n")
        
        # 2. Perform the arithmetic operation
        print("Executing Equation: King - Man + Woman")
        v_ollama_calculated = v_ollama_king - v_ollama_man + v_ollama_woman

        print("\n" + "*" * 50)
        print(f"OLLAMA API EMBEDDINGS: {embed_dir}")
        print("*" * 50)
    
        # Print a truncated preview of the vectors to keep the console clean
        print(f"\nCalculated Vector (First 5 dims): {v_ollama_calculated.components[:5]}")
        print(f"Target 'Queen' Vector (First 5 dims): {v_ollama_queen.components[:5]}")

        # 3. Compute and display all similarity and distance metrics
        print("\n" + "=" * 50)
        print("OLLAMA METRIC ANALYSIS: Calculated Vector vs. Target 'Queen'")
        print("=" * 50)

        cos_sim = v_ollama_calculated.cosine_similarity(v_ollama_queen)
        print(f"1. Cosine Similarity:     {cos_sim:.6f}")

        dot_prod = v_ollama_calculated.dot_product(v_ollama_queen)
        print(f"2. Dot Product (Inner):   {dot_prod:.6f}")

        euclidean = v_ollama_calculated.euclidean_distance(v_ollama_queen)
        print(f"3. Euclidean Dist (L2):   {euclidean:.6f}")

        manhattan = v_ollama_calculated.manhattan_distance(v_ollama_queen)
        print(f"4. Manhattan Dist (L1):   {manhattan:.6f}")
        print("=" * 50)

        # 4. Divine Similarity Metrics
        print("\n" + "*" * 50)
        print(f"OLLAMA API EMBEDDINGS: {embed_dir}")
        print("*" * 50)

        print("\n" + "=" * 50)
        print("Calculating [King - Man + God] and comparing to Target [Christ]")
        print("=" * 50)
        
        # Perform the arithmetic operation
        print("Executing Equation: [King - Man + God]")
        v_ollama_calculated_divine = v_ollama_king - v_ollama_man + v_ollama_god

        # Print a truncated preview of the vectors to keep the console clean
        print(f"\nCalculated Vector of [King - Man + God] (First 5 dims): {v_ollama_calculated_divine.components[:5]}")
        print(f"Target 'Christ' Vector (First 5 dims): {v_ollama_christ.components[:5]}")
        
        # Compute and display all Divine similarity and distance metrics
        print("\n" + "=" * 50)
        print(f"OLLAMA METRIC ANALYSIS [{embed_dir}]:\nCalculated Vector [King - Man + God] vs. Target [Christ]")
        print("=" * 50)

        cos_sim = v_ollama_calculated_divine.cosine_similarity(v_ollama_christ)
        print(f"1. Cosine Similarity:     {cos_sim:.6f}")

        dot_prod = v_ollama_calculated_divine.dot_product(v_ollama_christ)
        print(f"2. Dot Product (Inner):   {dot_prod:.6f}")

        euclidean = v_ollama_calculated_divine.euclidean_distance(v_ollama_christ)
        print(f"3. Euclidean Dist (L2):   {euclidean:.6f}")

        manhattan = v_ollama_calculated_divine.manhattan_distance(v_ollama_christ)
        print(f"4. Manhattan Dist (L1):   {manhattan:.6f}")
        print("=" * 50)

        # 5. Divine Similarity Metrics: The Hypostatic Union
        
        print("\n" + "*" * 50)
        print(f"TESTING NEW THEOLOGICAL EQUATIONS [{embed_dir}]")
        print("*" * 50)
        
        # Test 1: God + Man = Christ
        print("Executing Equation 1: God + Man")
        v_hypostatic = v_ollama_god + v_ollama_man

        print(f"\nCalculated Vector of [God + Man] (First 5 dims): {v_hypostatic.components[:5]}")
        print(f"Target 'Christ' Vector (First 5 dims): {v_ollama_christ.components[:5]}")
        
        print("\n" + "=" * 50)
        print(f"OLLAMA METRIC ANALYSIS [{embed_dir}]: \n [God + Man] vs. [Christ]")
        print("=" * 50)
        print(f"1. Cosine Similarity:     {v_hypostatic.cosine_similarity(v_ollama_christ):.6f}")
        print(f"2. Dot Product (Inner): {v_hypostatic.dot_product(v_ollama_christ):.6f}")
        print(f"3. Euclidean Dist (L2):   {v_hypostatic.euclidean_distance(v_ollama_christ):.6f}")
        print(f"4. Manhattan Dist (L1):   {v_hypostatic.manhattan_distance(v_ollama_christ):.6f}")
        print("=" * 50)

        # Test 2: God + King = Christ
        print("\nExecuting Equation 2: God + King")
        v_divine_king = v_ollama_god + v_ollama_king

        print(f"\nCalculated Vector of [God + King] (First 5 dims): {v_divine_king.components[:5]}")
        print(f"Target 'Christ' Vector (First 5 dims): {v_ollama_christ.components[:5]}")
        
        print("\n" + "=" * 50)
        print(f"OLLAMA METRIC ANALYSIS [{embed_dir}]: \n [God + King] vs. [Christ]")
        print("=" * 50)
        print(f"1. Cosine Similarity:     {v_divine_king.cosine_similarity(v_ollama_christ):.6f}")
        print(f"2. Dot Product (Inner): {v_divine_king.dot_product(v_ollama_christ):.6f}")
        print(f"3. Euclidean Dist (L2):   {v_divine_king.euclidean_distance(v_ollama_christ):.6f}")
        print(f"4. Manhattan Dist (L1):   {v_divine_king.manhattan_distance(v_ollama_christ):.6f}")
        print("=" * 50)

        # 6. Breaking the 0.86 Cosine Similarity Threshold
        
        print("\n" + "*" * 50)
        print(f"BREAKING THE THRESHOLD: HIGH-FIDELITY EQUATIONS [{embed_dir}]")
        print("*" * 50)

        # Equation 1: Trinitarian Math
        print("\nExecuting Equation 1: God - Father + Son")
        v_trinitarian = v_ollama_god - v_ollama_father + v_ollama_son

        print(f"\nCalculated Vector of [God - Father + Son] (First 5 dims): {v_trinitarian.components[:5]}")
        print(f"Target 'Christ' Vector (First 5 dims): {v_ollama_christ.components[:5]}")
        
        print("\n" + "=" * 50)
        print(f"OLLAMA METRIC ANALYSIS [{embed_dir}]: \n [God - Father + Son] vs. [Christ]")
        print("=" * 50)
        print(f"1. Cosine Similarity:     {v_trinitarian.cosine_similarity(v_ollama_christ):.6f}")
        print(f"2. Dot Product (Inner):   {v_trinitarian.dot_product(v_ollama_christ):.6f}")
        print(f"3. Euclidean Dist (L2):   {v_trinitarian.euclidean_distance(v_ollama_christ):.6f}")
        print(f"4. Manhattan Dist (L1):   {v_trinitarian.manhattan_distance(v_ollama_christ):.6f}")
        print("=" * 50)

        # Equation 2: Soteriological Math
        print("\nExecuting Equation 2: Jesus + Savior")
        v_soteriological = v_ollama_jesus + v_ollama_savior

        print(f"\nCalculated Vector of [Jesus + Savior] (First 5 dims): {v_soteriological.components[:5]}")
        print(f"Target 'Christ' Vector (First 5 dims): {v_ollama_christ.components[:5]}")
        
        print("\n" + "=" * 50)
        print(f"OLLAMA METRIC ANALYSIS [{embed_dir}]: \n [Jesus + Savior] vs. [Christ]")
        print("=" * 50)
        print(f"1. Cosine Similarity:     {v_soteriological.cosine_similarity(v_ollama_christ):.6f}")
        print(f"2. Dot Product (Inner):   {v_soteriological.dot_product(v_ollama_christ):.6f}")
        print(f"3. Euclidean Dist (L2):   {v_soteriological.euclidean_distance(v_ollama_christ):.6f}")
        print(f"4. Manhattan Dist (L1):   {v_soteriological.manhattan_distance(v_ollama_christ):.6f}")
        print("=" * 50)

        # Equation 3: Etymological Math
        print("\nExecuting Equation 3: Jesus + Anointed")
        v_etymological = v_ollama_jesus + v_ollama_anointed

        print(f"\nCalculated Vector of [Jesus + Anointed] (First 5 dims): {v_etymological.components[:5]}")
        print(f"Target 'Christ' Vector (First 5 dims): {v_ollama_christ.components[:5]}")
        
        print("\n" + "=" * 50)
        print(f"OLLAMA METRIC ANALYSIS [{embed_dir}]: \n [Jesus + Anointed] vs. [Christ]")
        print("=" * 50)
        print(f"1. Cosine Similarity:     {v_etymological.cosine_similarity(v_ollama_christ):.6f}")
        print(f"2. Dot Product (Inner):   {v_etymological.dot_product(v_ollama_christ):.6f}")
        print(f"3. Euclidean Dist (L2):   {v_etymological.euclidean_distance(v_ollama_christ):.6f}")
        print(f"4. Manhattan Dist (L1):   {v_etymological.manhattan_distance(v_ollama_christ):.6f}")
        print("=" * 50)
        
    except FileNotFoundError as e:
        print(f"\n[!] Missing JSON file: {e.filename}")
        print(f"Please create the '{embed_dir}' directory and use Postman or cURL to save")
        print(f"the Ollama API responses for 'king.json', 'man.json', 'woman.json', and 'queen.json'.")
        print("\nExample cURL request:")
        print("curl http://localhost:11434/api/embed -d \"{\\\"model\\\": \\\"qwen3-embedding:0.6b\\\", \\\"input\\\": \\\"King\\\"}\" > \"embeddings/qwen3/king.json\"")